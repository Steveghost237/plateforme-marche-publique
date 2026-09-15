export const metadata = {
  title: 'ComeBuy — La marketplace du Cameroun',
  description: 'Achetez et vendez en ligne au Cameroun. Paiement MTN Mobile Money, Orange Money, Stripe et PayPal. Livraison rapide partout au Cameroun.',
  keywords: 'marketplace cameroun, MTN MoMo, Orange Money, achat en ligne cameroun, comebuy',
  openGraph: {
    title: 'ComeBuy — La marketplace du Cameroun',
    description: 'La plateforme de commerce en ligne #1 au Cameroun',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body style={{ margin: 0, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
