# Lunna Caseirinhos - Bolos e Doces

Loja virtual de confeitaria com catálogo de produtos, carrinho, checkout em etapas e envio do pedido pelo WhatsApp.

## Estrutura

- `index.html` — página principal
- `assets/css/style.css` — estilos da loja
- `assets/js/app.js` — lógica da aplicação
- `admin.html` — painel administrativo
- `supabase-setup.sql` — tabelas, armazenamento e políticas de acesso do Supabase

## Como usar

1. Abra `index.html` em um navegador.
2. Ajuste os dados da loja no objeto `CONFIG` em `assets/js/config.js`.
3. Personalize produtos e categorias no catálogo.

## Ajustes rápidos

- Altere `nomeLoja`, `whatsapp`, `pixChave`, `pixNome`, `pixCidade`, `mapaUrl`, `endereco` e `taxaEntrega` em `CONFIG`.
- `whatsapp` e `pixChave` podem usar o mesmo número somente se estiver cadastrado como chave PIX; para celular, use o formato `+55...`.
- Para trocar os produtos, edite a lista `PRODUTOS`.
- Para alterar as categorias, edite a lista `CATEGORIAS`.

## Painel de administração local

Abra `admin.html` no mesmo navegador e endereço usado para abrir a loja. O painel permite editar os produtos, o banner, nome e contato da loja, endereço, chave e dados do PIX, taxa de entrega e desconto. Não precisa de senha; as alterações são guardadas no armazenamento local desse navegador.

As alterações não são enviadas ao Supabase nem aparecem para clientes em outros dispositivos ou navegadores. Para usar fotos, informe uma URL ou envie um arquivo de até 512 KB. **Restaurar conteúdo inicial** apaga as alterações locais.

O arquivo `supabase-setup.sql` é legado e não é necessário para esse modo local.
