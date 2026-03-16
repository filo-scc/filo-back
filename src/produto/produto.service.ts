import { NotFoundException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {CreateProdutoDto} from "./dto/create-produto.dto"
import { UpdateProduto } from "./dto/update-produto.dto";

@Injectable()
export class ProdutoService{
    constructor(private prisma: PrismaService){}

    async cadastrar(data: CreateProdutoDto){
        return await this.prisma.produto.create({
            data:{
                foto: data.foto,
                nome: data.nome,
                tipo: data.tipo,
                fabrico_id: data.fabrico_id
            }
        })
    }

    async buscar_todos(){
        return this.prisma.produto.findMany();
    }

    async buscar_id(id: number){
        const produto = await this.prisma.produto.findUnique({where: {id}})
        if (!produto){
            throw new NotFoundException("Produto não encontrado");
        }
        return produto
    }

    async deletar(id: number){
        const produto = await this.prisma.produto.findUnique({where: {id}})
        if(produto){
            await this.prisma.produto.delete({where: {id}})
            return `O produto com o id ${id} foi deletado com sucesso`
        }else{
            throw new NotFoundException("Produto não encontrado")
        }
    }

    async atualizar(id: number, dados: UpdateProduto){
        const produto = await this.prisma.produto.findUnique({where: {id}})
        if(!produto){
            throw new NotFoundException("Prduto não encontrado")
        }
        await this.prisma.produto.update({where: {id: id}, data: dados});
        return `O produto com o ${id} foi atualizado`
    }
}