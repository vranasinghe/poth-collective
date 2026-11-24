import { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Poth Collective — Books, bookshops & community</title>
        <meta name="description" content="Discover books and independent bookshops, join reading conversations, and explore Poth Collective’s reader and merchant experiences." />
        <meta name="theme-color" content="#203D33" />
        <meta property="og:title" content="Poth Collective" />
        <meta property="og:description" content="A book marketplace and reading community with a professional bookshop workspace." />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
