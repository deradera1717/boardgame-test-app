import React from 'react';

export default function Home() {
  return (
    <section>
      <h2>ようこそ — Next.js + pnpm + Vercel</h2>
      <p>
        App Router と TypeScript を使ったミニマルスターターです。pnpm を標準の
        パッケージマネージャーとして設定し、Vercel デプロイを想定しています。
      </p>
      <p>
        開発を始めるには <code>pnpm install</code> のあとに{' '}
        <code>pnpm dev</code> を実行してください。
      </p>
    </section>
  );
}

