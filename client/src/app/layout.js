import '@ant-design/v5-patch-for-react-19';
import '../index.css';
import Providers from './providers';

export const metadata = {
  title: 'TechCSR-CSR Product',
  description: 'TechCSR-CSR Product Web Application',
};

export default function RootLayout({ children }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="icon" type="image/png" href={`${baseUrl}/assets/logo/TechCSR Logo.png`} />
        <link href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href={`${baseUrl}/assets/css/style.min.css`} />
        <link rel="stylesheet" href={`${baseUrl}/assets/css/my-css.css`} />
        <link rel="stylesheet" href={`${baseUrl}/assets/css/timeline.css`} />
      </head>
      <body>
        <div id="root">
          <Providers>
            {children}
          </Providers>
        </div>
      </body>
    </html>
  );
}
