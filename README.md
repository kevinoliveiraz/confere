# Confere

Aplicação desktop simples para registrar saldo do sistema e quantidade física, calcular diferenças e revisar cada item antes de finalizar a transcrição.

## Executar

Abra `index.html` no navegador. Não precisa instalar dependências.

Para um endereço local estável, recomendado para manter o armazenamento sempre na mesma origem, execute nesta pasta:

```sh
python3 -m http.server 8080
```

Acesse http://localhost:8080. Use sempre o mesmo navegador, perfil e endereço. O armazenamento de arquivos abertos diretamente pode variar entre navegadores.

## Funcionamento

1. Crie uma contagem com nome e data.
2. Adicione itens com nome, código opcional, unidade, sistema e físico.
3. Clique em **Ir para revisão**. Campos pendentes ou inválidos impedem a revisão.
4. A revisão abre uma tela dedicada, sem tabela ou painel lateral. Compare os valores do sistema e do físico; os botões de copiar permitem transcrever as quantidades. **Confirmar e próximo** marca o item como revisado; **Anterior** não desfaz marcações. É possível desmarcar uma revisão.
5. No último item, use **Confirmar e finalizar**. Todos os itens precisam estar revisados. O resumo final permite consultar os itens ou voltar às contagens.

O salvamento automático usa localStorage e só informa **Tudo salvo** após a gravação. Você pode sair e retomar a revisão. O histórico inclui contagens em andamento e finalizadas. Reabrir exige confirmação, preserva uma versão anterior no backup e reinicia as marcações.

A diferença é físico menos sistema. Vazio não é zero. Valores negativos são rejeitados na revisão. `un` e `cx` aceitam inteiros; `kg`, `g`, `L` e `m` aceitam até três casas decimais, sem arredondamento silencioso. Os cálculos usam inteiros em milésimos, até 1 bilhão por quantidade. Igualdade numérica não significa auditoria confirmada.

Busca e filtros (todos, divergentes e pendentes) não alteram a ordem de revisão, que segue a inclusão dos itens. Remover um item exige confirmação. Nenhuma quantidade de itens diferentes é somada. **Pausar e sair** preserva a posição e permite retomar a revisão depois.

## Backup e limitações

Os dados pertencem ao navegador e podem ser perdidos ao limpar seu armazenamento. Exporte um backup JSON regularmente em **Histórico**. A importação valida formato, itens, estados e progresso antes de pedir confirmação e importar como cópias, sem substituir registros existentes. Arquivos de até 10 MB.

Sem login, backend, sincronização, integrações ou serviços pagos. A edição simultânea em várias abas não é suportada: use uma aba por vez. A versão prioriza desktop. Os registros iniciais ficam vazios; use somente dados fictícios em demonstrações e screenshots.

## Verificação

Com Node.js instalado:

```sh
node --check app.js
node test.cjs
```

Os testes verificam regras de quantidade, cálculo, ordem, restauração de dados serializados e o fluxo de revisão: tela sem tabela, confirmação, navegação, retomada, bloqueio de finalização incompleta, reabertura e falha de armazenamento. A conferência visual e as interações reais devem ser verificadas no navegador, incluindo copiar valores e importar/exportar backup.

## Interface

O botão de lua/sol no cabeçalho alterna os modos claro e escuro, inclusive no celular. A escolha fica salva neste navegador, separada dos dados das contagens. Sem escolha anterior, o tema acompanha a preferência do sistema. O modo escuro inclui tabelas, revisão, diálogos e estados de divergência.

Visual em verde profundo, superfícies claras e contraste por estado: azul para quantidade física maior, terracota para menor e verde para saldos iguais. Há foco de teclado visível, rótulos nos campos, progresso acessível, redução de movimento e layout adaptável a telas pequenas. No celular, cada item aparece como uma ficha com nome, código opcional, unidade e os dois saldos visíveis, sem rolagem horizontal. Os campos são maiores para facilitar o toque, e as ações finais ficam no fluxo da página para não cobrir a edição. A tabela permanece no desktop; a revisão continua em uma tela dedicada em qualquer largura. Não usa fontes, bibliotecas ou recursos de rede externos.

## Arquivos

- `index.html`: estrutura semântica e diálogo de criação.
- `styles.css`: apresentação em CSS tradicional.
- `app.js`: regras, interface e persistência, sem bibliotecas externas.
- `test.cjs`: verificações das regras com Node.js.
