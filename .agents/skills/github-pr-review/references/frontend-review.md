# Perfil de revisão do filo-front

Use este perfil somente quando o PR alterar o frontend.

## Superfícies prioritárias

- React: origem do estado, valores derivados, closures e respostas fora de ordem.
- Formulários e mutações: payload final, zero/`false`/`null`, remoções, reenvio e falha parcial.
- Sessão e rotas: loading, expiração, troca de conta, limpeza de cache e ausência de permissão.
- Experiência: loading, vazio, sucesso, erro, foco, teclado e confirmação de ações críticas.
- Documentos: versão dos dados, carregamento assíncrono, paginação, moeda e isolamento de sessão.
- Contrato: services, endpoints, DTOs, enums e comportamento com versões adjacentes do backend.

## Checks e validação visual

Use os comandos não destrutivos do `AGENTS.md`. Enquanto não houver script oficial de testes, declare que testes automatizados de interface não foram executados; lint e build não os substituem. Para mudança visual ou de interação, inspecione a interface quando o ambiente estiver disponível e percorra viewport, loading, vazio, sucesso e falha proporcionais ao risco.

## Limite de segurança

Botão oculto ou rota privada não prova autorização. Quando a conclusão depender do enforcement, consulte o backend disponível ou registre a evidência como ausente.
