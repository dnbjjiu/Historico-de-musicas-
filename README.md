# Histórico Musical do YouTube

MVP local para descobrir quais músicas o usuário mais ouve no YouTube. A métrica principal vem do histórico oficial exportado pelo Google Takeout, então pode contabilizar celular, computador, TV e outros dispositivos desde que o uso esteja na mesma conta Google/YouTube.

## Setup

1. Configure `.env`:

```env
YOUTUBE_API_KEY=sua_chave_da_youtube_data_api
DATABASE_URL="file:./dev.db"
```

2. Instale e prepare o banco:

```bash
npm install
npm run prisma:push
npm run db:seed
```

3. Rode o app:

```bash
npm run dev
```

## Métrica Principal

- Reprodução = uma entrada única do histórico de visualizações do YouTube.
- A importação aceita `watch-history.json`, `watch-history.html` ou `.htm` do Google Takeout.
- A chave única é `youtubeVideoId + watchedAt`, então importar o mesmo arquivo novamente não duplica contagem.
- A origem dessas reproduções fica como `youtube_history_import`.
- O ranking padrão foca em músicas e separa vídeos não musicais no gênero `Outros`.
- O top 5 usa thumbnail/capa do YouTube quando disponível.

## Filtros de Data

- `Semanal`: últimos 7 dias.
- `Mensal`: últimos 30 dias.
- `6 meses`: últimos 183 dias.
- `Anual`: ano atual.
- `Tudo`: histórico completo importado.
- Os cards de insight mostram campeã da janela, gênero dominante e última escuta dentro do filtro ativo.

## Gênero Automático

- O sistema infere gênero por título, canal e categoria retornada pela API do YouTube.
- Gêneros conhecidos incluem `Forró`, `Funk`, `Rap`, `Pop`, `Rock`, `Pagode`, `Sertanejo`, `MPB`, `Gospel`, `Eletrônica` e `Outros`.
- A inferência é uma heurística e pode errar; o gênero continua editável manualmente no ranking.

## Métricas Secundárias

- Clique em `Tocar` dentro do app registra origem `internal_player`.
- Clique em `YouTube` dentro do app registra origem `external_youtube`.
- Essas métricas continuam úteis para uso manual, mas o ranking mais fiel vem do Takeout.

## Comandos

```bash
npm run typecheck
npm run build
npm run prisma:generate
npm run prisma:push
npm run db:seed
```

## Observações

- A API oficial do YouTube não permite puxar o histórico privado da conta em tempo real.
- O Google Takeout só contém o que o YouTube registrou: não inclui aba anônima, uso deslogado, conta diferente ou histórico pausado.
- O tema visual usa Carbon `#171717` e Lime `#C6FF34`.
- Sem `YOUTUBE_API_KEY`, a busca manual retorna uma mensagem pedindo configuração do `.env`; a importação do Takeout não depende da chave.
