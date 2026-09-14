export interface AuthenticatedFabrico {
    id: number;
    ativo: boolean;
}

interface AuthenticatedUserBase {
    id: number;
    email: string;
    nome: string | null;
    foto_de_perfil: string | null;
}

export interface AdminAuthenticatedUser extends AuthenticatedUserBase {
    cargo: "ADMIN";
    fabrico_id: null;
    fabrico: null;
}

export interface BusinessAuthenticatedUser extends AuthenticatedUserBase {
    cargo: "PROPRIETARIO" | "GERENTE";
    fabrico_id: number;
    fabrico: AuthenticatedFabrico;
}

export type AuthenticatedUser = AdminAuthenticatedUser | BusinessAuthenticatedUser;

export interface JwtPayload {
    id: number;
}
