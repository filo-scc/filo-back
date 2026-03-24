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

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) {}

    async create(data: CreateUserDto) {
        const existente = await this.prisma.usuario.findFirst({
            where: {
                nome: data.nome,
                fabrico_id: data.fabrico_id,
            },
        });

        if (existente) {
            throw new ConflictException("Já existe um usuário com esse nome no seu fabrico!");
        }

        const hash = await this.hashData(data.senha);

        data.senha = hash;

        await this.prisma.usuario.create({
            data: {
                ...data,
            },
        });

        return { message: "Usuário criado com sucesso!" };
    }

    async getAllByFabricoId(fabrico_id: number) {
        return this.prisma.usuario.findMany({
            where: { fabrico_id },
        });
    }

    async getById(id: number) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { id },
        });

        if (!usuario) {
            throw new NotFoundException("Usuário não encontrado");
        }

        return usuario;
    }

    async update(id: number, data: UpdateUserDto) {
        try {
            const existente = await this.prisma.usuario.findFirst({
                where: {
                    nome: data.nome,
                    fabrico_id: data.fabrico_id,
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
                    ...data,
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
            secret: JWT_ACCESS_SECRET,
            expiresIn: 60 * 15, // 15 minutos
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: JWT_REFRESH_SECRET,
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

    async refresh(usuario_id: number) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { id: usuario_id },
        });

        if (!usuario) {
            throw new UnauthorizedException();
        }

        return this.generateTokens(usuario);
    }

    async logout(usuario_id: number) {
        await this.prisma.usuario.update({
            where: { id: usuario_id },
            data: { refresh_token_hash: null },
        });

        return { message: "Logout realizado." };
    }

    async hashData(data: string) {
        const rounds = 10;

        return bcrypt.hash(data, rounds);
    }
}
