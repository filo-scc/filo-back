import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { Cargo, Prisma } from "@prisma/client";
import { CreateUserDto } from "./dto/create-user-dto";
import { UpdateUserDto } from "./dto/update-user-dto";
import { LoginDto } from "./dto/login-dto";
import { EnderecoService } from "../endereco/endereco.service";
import { AuthenticatedUser } from "./types/authenticated-user";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private enderecoService: EnderecoService,
    ) {}

    async create(data: CreateUserDto) {
        const { endereco, ...dadosRecebidos } = data;
        const dadosUsuario = {
            ...dadosRecebidos,
            fabrico_id: dadosRecebidos.cargo === Cargo.ADMIN ? null : dadosRecebidos.fabrico_id,
        };

        if (dadosUsuario.cargo !== Cargo.ADMIN) {
            if (!dadosUsuario.fabrico_id) {
                throw new BadRequestException("Informe o fabrico_id para criar o usuário");
            }

            const fabrico = await this.prisma.fabrico.findFirst({
                where: { id: dadosUsuario.fabrico_id, ativo: true },
                select: { id: true },
            });

            if (!fabrico) {
                throw new NotFoundException("Fábrico não encontrado ou inativo");
            }
        }

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
            const usuario = await this.prisma.usuario.create({
                data: { ...dadosUsuario },
            });

            const enderecoCriado = await this.enderecoService.create(endereco ?? {});

            await this.prisma.usuario.update({
                where: { id: usuario.id },
                data: { endereco: { connect: { id: enderecoCriado.id } } },
            });

            return { message: "Usuário criado com sucesso!" };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                throw new ConflictException("Este e-mail já está em uso!");
            }
            throw error;
        }
    }

    async getAllByFabricoId(user: AuthenticatedUser, fabrico_id?: number) {
        const fabricoId = user.cargo === Cargo.ADMIN ? fabrico_id : user.fabrico_id;

        if (!fabricoId) {
            throw new BadRequestException("Informe o fabrico_id para listar os usuários");
        }

        return this.prisma.usuario.findMany({
            where: { fabrico_id: fabricoId, cargo: { not: Cargo.ADMIN } },
            select: {
                id: true,
                email: true,
                nome: true,
                cargo: true,
                fabrico_id: true,
                foto_de_perfil: true,
                endereco: true,
            },
        });
    }

    async getById(id: number, user: AuthenticatedUser) {
        const usuario = await this.prisma.usuario.findFirst({
            where: {
                id,
                ...(user.cargo === Cargo.ADMIN
                    ? {}
                    : { fabrico_id: user.fabrico_id, cargo: { not: Cargo.ADMIN } }),
            },
            select: {
                id: true,
                email: true,
                nome: true,
                cargo: true,
                fabrico_id: true,
                foto_de_perfil: true,
                endereco: true,
            },
        });

        if (!usuario) {
            throw new NotFoundException("Usuário não encontrado");
        }

        return usuario;
    }

    async update(id: number, data: UpdateUserDto, user: AuthenticatedUser) {
        const { endereco, ...dadosUsuario } = data;
        Reflect.deleteProperty(dadosUsuario, "fabrico_id");

        try {
            const usuarioAtual = await this.getById(id, user);

            if (user.cargo !== Cargo.ADMIN && dadosUsuario.cargo === Cargo.ADMIN) {
                throw new ForbiddenException("Apenas administradores podem atribuir o cargo ADMIN");
            }

            if (
                usuarioAtual.cargo === Cargo.ADMIN &&
                dadosUsuario.cargo &&
                dadosUsuario.cargo !== Cargo.ADMIN
            ) {
                throw new BadRequestException(
                    "Não é possível converter um administrador global em usuário de fábrico",
                );
            }

            if (dadosUsuario.nome) {
                const existente = await this.prisma.usuario.findFirst({
                    where: {
                        nome: dadosUsuario.nome,
                        fabrico_id: usuarioAtual.fabrico_id,
                        id: { not: id },
                    },
                });

                if (existente) {
                    throw new ConflictException(
                        "Já existe um usuário com esse nome no seu fabrico!",
                    );
                }
            }

            if (endereco) {
                if (!usuarioAtual.endereco) {
                    throw new NotFoundException("Endereço do usuário não encontrado");
                }
                await this.enderecoService.update(usuarioAtual.endereco.id, endereco);
            }

            await this.prisma.usuario.update({
                where: { id },
                data: {
                    ...dadosUsuario,
                    ...(dadosUsuario.cargo === Cargo.ADMIN ? { fabrico_id: null } : {}),
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

    async delete(id: number, user: AuthenticatedUser) {
        await this.getById(id, user);

        await this.prisma.usuario.delete({
            where: { id },
        });

        return { message: "Usuário deletado com sucesso!" };
    }

    async validateUser(email: string, senha: string) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { email },
            include: {
                fabrico: {
                    select: {
                        id: true,
                        ativo: true,
                    },
                },
            },
        });

        if (!usuario) throw new UnauthorizedException("Credenciais inválidas");

        const validacao = await bcrypt.compare(senha, usuario.senha);

        if (!validacao) throw new UnauthorizedException("Credenciais inválidas");

        if (usuario.cargo !== Cargo.ADMIN && (!usuario.fabrico || !usuario.fabrico.ativo)) {
            throw new UnauthorizedException("Usuário sem fábrico ativo");
        }

        return usuario;
    }

    async generateTokens(usuario: any) {
        const fabrico_id = usuario.cargo === Cargo.ADMIN ? null : usuario.fabrico_id;

        const payload = {
            id: usuario.id,
            email: usuario.email,
            cargo: usuario.cargo,
            fabrico_id,
            foto_de_perfil: usuario.foto_de_perfil,
            nome: usuario.nome,
        };

        const accessToken = this.jwtService.sign(payload, {
            secret: JWT_ACCESS_SECRET,
            expiresIn: 60 * 15,
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: JWT_REFRESH_SECRET,
            expiresIn: 60 * 60 * 24 * 7,
        });

        const refreshHash = await this.hashData(refreshToken);

        await this.prisma.usuario.update({
            where: { id: usuario.id },
            data: { refresh_token_hash: refreshHash },
        });

        return { accessToken, refreshToken, user: payload };
    }

    async login(dto: LoginDto) {
        const usuario = await this.validateUser(dto.email, dto.senha);
        return this.generateTokens(usuario);
    }

    async refresh(usuario_id: number) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { id: usuario_id },
        });

        if (!usuario) throw new UnauthorizedException();

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
