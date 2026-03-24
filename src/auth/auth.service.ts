import {
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "src/prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { CreateUserDto } from "./dto/create-user-dto";
import { UpdateUserDto } from "./dto/update-user-dto";
import { LoginDto } from "./dto/login-dto";
import { CurrentUser } from "src/common/decorators/current-user.decorator";

// const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
// const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
// const JWT_ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION;
// const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION;
@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) {}

    async create(data: CreateUserDto) {
        const { endereco, ...dadosUsuario } = data;

        const existente = await this.prisma.usuario.findFirst({
            where: {
                nome: dadosUsuario.nome,
                fabrico_id: dadosUsuario.fabrico_id,
            },
        });

        if (existente) {
            throw new ConflictException("Já existe um usuário com esse nome no seu fabrico!");
        }

        const hash = await this.hashData(dadosUsuario.senha);
        dadosUsuario.senha = hash;

        try {
            await this.prisma.usuario.create({
                data: {
                    ...dadosUsuario,
                    endereco: endereco ? {
                        create: {
                            rua: endereco.rua,
                            numero: endereco.numero,
                            bairro: endereco.bairro,
                            cidade: endereco.cidade,
                            estado: endereco.estado,
                            complemento: endereco.complemento,
                        }
                    } : undefined,
                },
            });

            return { message: "Usuário criado com sucesso!" };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException("Este e-mail já está em uso!");
            }
            throw error;
        }
    }

    async getAllByFabricoId(fabrico_id: number) {
        return this.prisma.usuario.findMany({
            where: { fabrico_id },
            include: { endereco: true },
        });
    }

    async getById(id: number) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { id },
            include: { endereco: true },
        });

        if (!usuario) {
            throw new NotFoundException("Usuário não encontrado");
        }

        return usuario;
    }

    async update(id: number, data: UpdateUserDto) {
        const { endereco, ...dadosUsuario } = data;

        try {
            const existente = await this.prisma.usuario.findFirst({
                where: {
                    nome: dadosUsuario.nome,
                    fabrico_id: dadosUsuario.fabrico_id,
                    id: { not: id },
                },
            });

            if (existente) {
                throw new ConflictException("Já existe um usuário com esse nome no seu fabrico!");
            }

            await this.getById(id);

            await this.prisma.usuario.update({
                where: { id },
                data: {
                    ...dadosUsuario,
                    endereco: endereco ? {
                        upsert: {
                            create: { ...endereco },
                            update: { ...endereco }
                        }
                    } : undefined,
                },
            });

            return { message: "Usuário atualizado com sucesso!" };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    throw new ConflictException("Email já cadastrado");
                }
            }

            throw error;
        }
    }

    async delete(id: number) {
        await this.getById(id);

        await this.prisma.usuario.delete({
            where: { id },
        });

        return { message: "Usuário deletado com sucesso!" };
    }

    async validateUser(email: string, senha: string) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { email },
        });

        if (!usuario) throw new UnauthorizedException("Credenciais inválidas");

        const validacao = await bcrypt.compare(senha, usuario.senha);

        if (!validacao) throw new UnauthorizedException("Credenciais inválidas");

        return usuario;
    }

    async generateTokens(usuario: any) {
        const payload = {
            sub: usuario.id,
            email: usuario.email,
            cargo: usuario.cargo,
            fabrico_id: usuario.fabrico_id,
        };

        const accessToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_ACCESS_SECRET,
            expiresIn: 60 * 15, // 15 minutos
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: 60 * 60 * 24 * 7, // 7 dias
        });

        const refreshHash = await this.hashData(refreshToken);

        await this.prisma.usuario.update({
            where: { id: usuario.id },
            data: { refresh_token_hash: refreshHash },
        });

        return { accessToken, refreshToken };
    }

    async login(dto: LoginDto) {
        const usuario = await this.validateUser(dto.email, dto.senha);

        return this.generateTokens(usuario);
    }

    async refresh(@CurrentUser() usuario: any) {
        const usuarioDb = await this.prisma.usuario.findUnique({
            where: { id: usuario.id },
        });

        if (!usuarioDb) throw new UnauthorizedException();

        return this.generateTokens(usuarioDb);
    }

    async logout(usuarioId: number) {
        await this.prisma.usuario.update({
            where: { id: usuarioId },
            data: { refresh_token_hash: null },
        });

        return { message: "Logout realizado." };
    }

    async hashData(data: string) {
        const rounds = 10;

        return bcrypt.hash(data, rounds);
    }
}
