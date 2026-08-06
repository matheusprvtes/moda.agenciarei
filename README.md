# LP Moda — Acelerador de E-commerce de Moda Feminina

Landing page estática (HTML/CSS/JS puro, sem build). Basta publicar a pasta `deploy/`.

## Estrutura

```
deploy/
├── index.html            página principal (copy aprovada, 8 seções)
├── privacidade.html      Política de Privacidade (LGPD)
├── termos.html           Termos de Uso
├── robots.txt
├── sitemap.xml
├── vercel.json           cache de assets + headers de segurança
└── assets/
    ├── css/styles.css    tokens da identidade visual da Agência Rei
    ├── js/main.js        interações, validação do formulário e tracking
    └── img/              logos + fotos em WebP
```

## Antes de ir ao ar (checklist)

- [ ] **Domínio:** `canonical`, Open Graph, `robots.txt` e `sitemap.xml` usam `https://moda.agenciarei.com.br`. Trocar pelo domínio final.
- [ ] **Google Tag Manager:** o snippet está no `index.html`, comentado no `<head>` e no `<body>`. Descomentar e substituir `GTM-XXXXXXX` pelo ID do container.
- [ ] **Destino dos leads:** preencher `CONFIG.endpoint` em `assets/js/main.js` com a URL do webhook/CRM. Enquanto estiver em branco, o formulário valida e mostra a tela de sucesso, mas não envia nada.
- [ ] **reCAPTCHA v3:** preencher `CONFIG.recaptchaSiteKey` em `assets/js/main.js`. O script do Google só carrega quando a chave existe; o token vai no campo `recaptcha_token` do payload e precisa ser validado no backend.
- [ ] **CDN/WAF:** publicar atrás de Cloudflare (ou equivalente) com WAF ativo, conforme a diretriz de blindagem contra DDoS.

## Tracking

Todos os CTAs têm `id` e `data-cta` próprios, prontos para acionar tags sem mexer no código:

| Elemento | id | data-cta |
|---|---|---|
| CTA da navbar | `cta-nav` | `nav` |
| CTA do menu mobile | `cta-menu` | `menu-mobile` |
| CTA do hero | `cta-hero` | `hero` |
| CTA do case | `cta-case` | `case` |
| CTA da metodologia | `cta-metodologia` | `metodologia` |
| CTA do bloco sobre | `cta-sobre` | `sobre` |
| CTA fixo mobile | `cta-sticky` | `sticky` |
| Botão do formulário | `cta-form` | `form` |
| Vídeos de depoimento | — | `video-1`, `video-2`, `video-3` |

Eventos enviados ao `dataLayer`: `cta_click`, `video_play`, `lead_form_submit` e `cookie_consent`.
Se o Meta Pixel estiver na página, o envio do formulário também dispara `fbq('track', 'Lead')`.

## Payload enviado pelo formulário

```json
{
  "origem": "lp-moda-acelerador-ecommerce",
  "pagina": "https://.../",
  "enviado_em": "2026-08-06T12:00:00.000Z",
  "nome": "", "email": "", "whatsapp": "", "whatsapp_e164": "55...",
  "loja": "", "faturamento": "", "consentimento_lgpd": true,
  "recaptcha_token": "(se configurado)",
  "utm_source": "(quando presente na URL)"
}
```

Os campos passam por sanitização no cliente (remoção de tags e caracteres de controle, limite de 300 caracteres).
**A sanitização definitiva continua sendo responsabilidade do backend/CRM.**

## Assets

As fotos originais (JPG) foram convertidas para WebP em dois tamanhos cada.
Os logos vieram do kit oficial (versão para fundo escuro e para fundo claro).
Os arquivos-fonte ficam em `../originais/` e não vão para o deploy.

## Efeito do hero (bolsas flutuando)

A foto do hero foi separada em camadas:

- `chapa-hero-*.webp` — a foto **sem as bolsas** (fundo reconstruído por ajuste de plano)
- `bolsa-prata.webp`, `bolsa-azul.webp`, `bolsa-cobre.webp` — recortes com transparência

Cada bolsa é posicionada em `%` exatamente sobre o lugar original, então **em repouso a
composição é idêntica à foto**. O `main.js` anima só as bolsas, com força proporcional à
presença do hero na tela: 1 com o hero visível, 0 quando ele sai — nesse ponto as
`custom properties` são removidas e as bolsas voltam ao lugar exato, sem 3D. Ao voltar
para o topo, o efeito ressurge. O laço `requestAnimationFrame` só roda com o hero visível
e nada disso é executado sob `prefers-reduced-motion`.

Para reposicionar ou trocar as bolsas, basta editar `--l`, `--t`, `--w` e `data-depth`
no `index.html`.

## Tema claro (teste)

`claro.html` é a mesma página com `data-theme="light"` + `assets/css/theme-light.css`.
É um arquivo de comparação (`noindex`): quando a versão for escolhida, o tema vira
padrão no `index.html` e este arquivo sai.

## Vídeos de depoimento

Carregam por *facade*: a página mostra só a miniatura e o iframe do YouTube é injetado apenas no clique.
IDs em uso: `lZ3n2p4zeTc`, `5cRPqVCwQKo`, `_QgeGfd5aHI`.
