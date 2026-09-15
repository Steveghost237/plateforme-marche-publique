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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Open+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, fontFamily: "'Open Sans', 'Segoe UI', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
