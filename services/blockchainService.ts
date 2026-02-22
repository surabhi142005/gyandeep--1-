import { ethers } from 'ethers';
import type { WalletInfo, NFTCertificate, BlockchainRecord } from '../types';

// Contract ABIs (will be replaced with actual ABIs after compilation)
const AttendanceRecordABI = { abi: [] };
const AcademicCredentialsABI = { abi: [] };
const GradingSystemABI = { abi: [] };

// Alchemy RPC URLs
const ALCHEMY_RPC_URLS: Record<number, string> = {
    11155111: `https://eth-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY || ''}`,
    80001: `https://polygon-mumbai.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY || ''}`,
    137: `https://polygon-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY || ''}`,
};

class BlockchainService {
    private provider: ethers.BrowserProvider | null = null;
    private signer: ethers.Signer | null = null;
    private walletInfo: WalletInfo | null = null;

    private contractAddresses = {
        attendanceRecord: '',
        academicCredentials: '',
        gradingSystem: ''
    };

    /**
     * Get a read-only provider using Alchemy RPC (no MetaMask needed).
     */
    getReadOnlyProvider(chainId: number): ethers.JsonRpcProvider | null {
        const rpcUrl = ALCHEMY_RPC_URLS[chainId];
        if (!rpcUrl || !import.meta.env.VITE_ALCHEMY_API_KEY) {
            return null;
        }
        return new ethers.JsonRpcProvider(rpcUrl);
    }

    /**
     * Connect to MetaMask wallet
     */
    async connectWallet(): Promise<WalletInfo> {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask is not installed. Please install MetaMask to use blockchain features.');
        }

        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });

            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();
            const address = await this.signer.getAddress();
            const network = await this.provider.getNetwork();
            const balance = await this.provider.getBalance(address);

            this.walletInfo = {
                address,
                connected: true,
                chainId: Number(network.chainId),
                balance: ethers.formatEther(balance)
            };

            await this.loadContractAddresses(Number(network.chainId));

            return this.walletInfo;
        } catch (error: any) {
            console.error('Failed to connect wallet:', error);
            if (error?.code === 4001) {
                throw new Error('Connection request was rejected. Please approve the MetaMask connection to continue.');
            }
            if (error instanceof Error && error.message.includes('Smart contracts')) {
                throw error;
            }
            throw new Error('Failed to connect to MetaMask. Please try again.');
        }
    }

    private async loadContractAddresses(chainId: number): Promise<void> {
        try {
            const networkName = this.getNetworkName(chainId);
            const response = await fetch(`/deployments/${networkName}.json`);
            if (!response.ok) {
                throw new Error(`Deployment file not found for network: ${networkName}`);
            }
            let deployment: any;
            try {
                deployment = await response.json();
            } catch {
                throw new Error('Invalid deployment file format');
            }
            if (!deployment?.contracts) {
                throw new Error('Deployment file missing contract addresses');
            }

            this.contractAddresses = {
                attendanceRecord: deployment.contracts.AttendanceRecord || '',
                academicCredentials: deployment.contracts.AcademicCredentials || '',
                gradingSystem: deployment.contracts.GradingSystem || ''
            };
        } catch (error) {
            console.error('Failed to load contract addresses:', error);
            throw new Error(error instanceof Error ? error.message : 'Smart contracts not deployed on this network');
        }
    }

    private getNetworkName(chainId: number): string {
        const networks: Record<number, string> = {
            1337: 'localhost',
            80001: 'mumbai',
            11155111: 'sepolia'
        };
        return networks[chainId] || 'unknown';
    }

    async recordAttendance(
        studentId: string,
        classId: string,
        timestamp: number,
        location: string
    ): Promise<BlockchainRecord> {
        if (!this.signer) throw new Error('Wallet not connected');

        const contract = new ethers.Contract(
            this.contractAddresses.attendanceRecord,
            AttendanceRecordABI.abi,
            this.signer
        );

        try {
            const tx = await contract.recordAttendance(studentId, classId, timestamp, location);
            const receipt = await tx.wait();

            const event = receipt.logs.find((log: any) => {
                try {
                    const parsed = contract.interface.parseLog(log);
                    return parsed?.name === 'AttendanceRecorded';
                } catch {
                    return false;
                }
            });

            const parsedEvent = event ? contract.interface.parseLog(event) : null;
            const recordId = parsedEvent ? Number(parsedEvent.args[0]) : 0;

            return {
                recordId,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                timestamp: Date.now(),
                verified: false
            };
        } catch (error) {
            console.error('Failed to record attendance:', error);
            throw new Error('Failed to record attendance on blockchain');
        }
    }

    async issueCertificate(
        recipientAddress: string,
        studentId: string,
        courseId: string,
        courseName: string,
        grade: string,
        metadataURI: string
    ): Promise<{ tokenId: number; transactionHash: string }> {
        if (!this.signer) throw new Error('Wallet not connected');

        const contract = new ethers.Contract(
            this.contractAddresses.academicCredentials,
            AcademicCredentialsABI.abi,
            this.signer
        );

        try {
            const tx = await contract.issueCertificate(recipientAddress, studentId, courseId, courseName, grade, metadataURI);
            const receipt = await tx.wait();

            const event = receipt.logs.find((log: any) => {
                try {
                    const parsed = contract.interface.parseLog(log);
                    return parsed?.name === 'CertificateIssued';
                } catch {
                    return false;
                }
            });

            const parsedEvent = event ? contract.interface.parseLog(event) : null;
            const tokenId = parsedEvent ? Number(parsedEvent.args[0]) : 0;

            return { tokenId, transactionHash: receipt.hash };
        } catch (error) {
            console.error('Failed to issue certificate:', error);
            throw new Error('Failed to issue certificate on blockchain');
        }
    }

    async recordGrade(
        studentId: string,
        quizId: string,
        subject: string,
        score: number,
        maxScore: number,
        teacherId: string
    ): Promise<BlockchainRecord> {
        if (!this.signer) throw new Error('Wallet not connected');

        const contract = new ethers.Contract(
            this.contractAddresses.gradingSystem,
            GradingSystemABI.abi,
            this.signer
        );

        try {
            const tx = await contract.recordGrade(studentId, quizId, subject, score, maxScore, teacherId);
            const receipt = await tx.wait();

            const event = receipt.logs.find((log: any) => {
                try {
                    const parsed = contract.interface.parseLog(log);
                    return parsed?.name === 'GradeRecorded';
                } catch {
                    return false;
                }
            });

            const parsedEvent = event ? contract.interface.parseLog(event) : null;
            const recordId = parsedEvent ? Number(parsedEvent.args[0]) : 0;

            return {
                recordId,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                timestamp: Date.now(),
                verified: true
            };
        } catch (error) {
            console.error('Failed to record grade:', error);
            throw new Error('Failed to record grade on blockchain');
        }
    }

    async verifyCertificate(tokenId: number): Promise<NFTCertificate | null> {
        // Use read-only Alchemy provider if no wallet connected
        const readProvider = this.provider || (this.walletInfo ? null : this.getReadOnlyProvider(11155111));
        if (!readProvider) throw new Error('No provider available');

        const contract = new ethers.Contract(
            this.contractAddresses.academicCredentials,
            AcademicCredentialsABI.abi,
            readProvider
        );

        try {
            const result = await contract.verifyCertificate(tokenId);
            if (!result.exists) return null;

            const owner = await contract.ownerOf(tokenId);
            const tokenURI = await contract.tokenURI(tokenId);

            return {
                tokenId,
                studentId: result.studentId,
                courseId: '',
                courseName: result.courseName,
                grade: result.grade,
                issueDate: Number(result.issueDate),
                metadataURI: tokenURI,
                revoked: !result.valid,
                owner
            };
        } catch (error) {
            console.error('Failed to verify certificate:', error);
            return null;
        }
    }

    async getStudentCertificates(studentId: string): Promise<number[]> {
        const readProvider = this.provider || this.getReadOnlyProvider(11155111);
        if (!readProvider) throw new Error('No provider available');

        const contract = new ethers.Contract(
            this.contractAddresses.academicCredentials,
            AcademicCredentialsABI.abi,
            readProvider
        );

        try {
            const tokenIds = await contract.getStudentCertificates(studentId);
            return tokenIds.map((id: bigint) => Number(id));
        } catch (error) {
            console.error('Failed to get student certificates:', error);
            return [];
        }
    }

    getWalletInfo(): WalletInfo | null {
        return this.walletInfo;
    }

    disconnect(): void {
        this.provider = null;
        this.signer = null;
        this.walletInfo = null;
    }
}

export const blockchainService = new BlockchainService();

declare global {
    interface Window {
        ethereum?: any;
    }
}
