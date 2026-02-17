import React, { useEffect, useState, useRef } from 'react';
import { websocketService } from '../services/websocketService';
import type { WalletInfo } from '../types';
import { blockchainService } from '../services/blockchainService';

interface BlockchainWalletProps {
    onWalletConnected?: (walletInfo: WalletInfo) => void;
}

const BlockchainWallet: React.FC<BlockchainWalletProps> = ({ onWalletConnected }) => {
    const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check if already connected
        const existingWallet = blockchainService.getWalletInfo();
        if (existingWallet) {
            setWalletInfo(existingWallet);
        }
    }, []);

    const handleConnect = async () => {
        setConnecting(true);
        setError(null);

        try {
            const wallet = await blockchainService.connectWallet();
            setWalletInfo(wallet);

            if (onWalletConnected) {
                onWalletConnected(wallet);
            }

            // Notify via WebSocket
            websocketService.sendBlockchainUpdate({
                type: 'wallet_connected',
                address: wallet.address,
                chainId: wallet.chainId
            });
        } catch (err: any) {
            setError(err.message || 'Failed to connect wallet');
            console.error('Wallet connection error:', err);
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = () => {
        blockchainService.disconnect();
        setWalletInfo(null);
        setError(null);
    };

    const getNetworkName = (chainId: number): string => {
        const networks: Record<number, string> = {
            1: 'Ethereum Mainnet',
            5: 'Goerli Testnet',
            11155111: 'Sepolia Testnet',
            137: 'Polygon Mainnet',
            80001: 'Mumbai Testnet',
            1337: 'Localhost'
        };
        return networks[chainId] || `Unknown (${chainId})`;
    };

    const shortenAddress = (address: string): string => {
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    if (!walletInfo) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md border-2 border-dashed border-gray-300">
                <div className="text-center">
                    <div className="text-5xl mb-4">🔗</div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Connect Blockchain Wallet</h3>
                    <p className="text-gray-600 mb-4">
                        Connect your MetaMask wallet to access blockchain features like immutable attendance records and NFT certificates.
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleConnect}
                        disabled={connecting}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {connecting ? (
                            <span className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Connecting...
                            </span>
                        ) : (
                            'Connect MetaMask'
                        )}
                    </button>

                    <p className="text-xs text-gray-500 mt-4">
                        Don't have MetaMask? <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Install it here</a>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg shadow-md border border-indigo-200">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <span className="text-2xl">✅</span>
                        Wallet Connected
                    </h3>
                </div>
                <button
                    onClick={handleDisconnect}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                    Disconnect
                </button>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="text-sm text-gray-600">Address</span>
                    <span className="font-mono text-sm font-medium text-gray-800">
                        {shortenAddress(walletInfo.address)}
                    </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="text-sm text-gray-600">Network</span>
                    <span className="text-sm font-medium text-gray-800">
                        {getNetworkName(walletInfo.chainId)}
                    </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="text-sm text-gray-600">Balance</span>
                    <span className="text-sm font-medium text-gray-800">
                        {parseFloat(walletInfo.balance).toFixed(4)} ETH
                    </span>
                </div>
            </div>

            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                    <span className="text-green-600 text-lg">ℹ️</span>
                    <p className="text-xs text-green-700">
                        Your wallet is connected and ready for blockchain transactions. All attendance records, grades, and certificates will be stored immutably on the blockchain.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BlockchainWallet;
