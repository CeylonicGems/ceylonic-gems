import type{Metadata}from"next";import{SiteHeader}from"@/components/site-header";import{Footer}from"@/components/footer";import"./globals.css";
export const metadata:Metadata={title:{default:"Ceylonic Gems",template:"%s | Ceylonic Gems"},description:"A premium verified meeting point for gemstone buyers and sellers."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><SiteHeader/><main>{children}</main><Footer/></body></html>}
