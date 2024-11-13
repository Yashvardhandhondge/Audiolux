"use client"
import { SocketContextProvider } from "@/context/socket-context"
import { ConnectionProvider,WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { SessionProvider } from "next-auth/react"
import {ThemeProvider as NextThemesProvider} from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

export function Providers({ children }: { children: React.ReactNode }) {
    return(
        <ConnectionProvider endpoint={'https://solana-devnet.g.alchemy.com/v2/DEhoo-faZJyJO03UWMXSsKycjKrK_w9G'} >
            <WalletProvider wallets={[]} autoConnect>
                <WalletModalProvider>
                    <SessionProvider>
                        {children}
                    </SessionProvider>
                </WalletModalProvider>

            </WalletProvider>

        </ConnectionProvider>
    )
}

export function ThemeProvider({children, ...props}:ThemeProviderProps) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}