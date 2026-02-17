import { ethers } from 'ethers';
import type { WalletInfo, NFTCertificate, BlockchainRecord } from '../types';

// Contract ABIs (simplified - will be replaced with actual ABIs after compilation)
import AttendanceRecordABI from '../artifacts/contracts/AttendanceRecord.sol/AttendanceRecord.json' assert { type: 'json' };
import AcademicCredentialsABI from '../artifacts/contracts/AcademicCredentials.sol/AcademicCredentials.json' assert { type: 'json' };
import GradingSystemABI from '../artifacts/contracts/GradingSystem.sol/GradingSystem.json' assert { type: 'json' };

class BlockchainService {
    private provider: ethers.BrowserProvider | null = null;
    private signer: ethers.Signer | null = null;
    private walletInfo: WalletInfo | null = null;

    // Contract addresses (will be loaded from deployment files)
    private contractAddresses = {
        attendanceRecord: '',
        academicCredentials: '',
        gradingSystem: ''
    };

    /**
     * Connect to MetaMask wallet
     */
    async connectWallet(): Promise<WalletInfo> {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask is not installed. Please install MetaMask to use blockchain features.');
        }

        try {
            // Request account access
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

            // Load contract addresses
            await this.loadContractAddresses(Number(network.chainId));

            return this.walletInfo;
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            throw new Error('Failed to connect to MetaMask');
        }
    }

    /**
     * Load contract addresses from deployment files
     */
    private async loadContractAddresses(chainId: number): Promise<void> {
        try {
            const networkName = this.getNetworkName(chainId);
            const response = await fetch(`/deployments/${networkName}.json`);
            const deployment = await response.json();

            this.contractAddresses = {
                attendanceRecord: deployment.contracts.AttendanceRecord,
                academicCredentials: deployment.contracts.AcademicCredentials,
                gradingSystem: deployment.contracts.GradingSystem
            };
        } catch (error) {
            console.error('Failed to load contract addresses:', error);
            throw new Error('Smart contracts not deployed on this network');
        }
    }

    /**
     * Get network name from chain ID
     */
    private getNetworkName(chainId: number): string {
        const networks: Record<number, string> = {
            1337: 'localhost',
            80001: 'mumbai',
            11155111: 'sepolia'
        };
        return networks[chainId] || 'unknown';
    }

    /**
     * Record attendance on blockchain
     */
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

            // Extract record ID from event
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

    /**
     * Issue NFT certificate
     */
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
            const tx = await contract.issueCertificate(
                recipientAddress,
                studentId,
                courseId,
                courseName,
                grade,
                metadataURI
            );
            const receipt = await tx.wait();

            // Extract token ID from event
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

            return {
                tokenId,
                transactionHash: receipt.hash
            };
        } catch (error) {
            console.error('Failed to issue certificate:', error);
            throw new Error('Failed to issue certificate on blockchain');
        }
    }

    /**
     * Record grade on blockchain
     */
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

    /**
     * Verify certificate
     */
    async verifyCertificate(tokenId: number): Promise<NFTCertificate | null> {
        if (!this.provider) throw new Error('Wallet not connected');

        const contract = new ethers.Contract(
            this.contractAddresses.academicCredentials,
            AcademicCredentialsABI.abi,
            this.provider
        );

        try {
            const result = await contract.verifyCertificate(tokenId);

            if (!result.exists) {
                return null;
            }

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

    /**
     * Get student's certificates
     */
    async getStudentCertificates(studentId: string): Promise<number[]> {
        if (!this.provider) throw new Error('Wallet not connected');

        const contract = new ethers.Contract(
            this.contractAddresses.academicCredentials,
            AcademicCredentialsABI.abi,
            this.provider
        );

        try {
            const tokenIds = await contract.getStudentCertificates(studentId);
            return tokenIds.map((id: bigint) => Number(id));
        } catch (error) {
            console.error('Failed to get student certificates:', error);
            return [];
        }
    }

    /**
     * Get wallet info
     */
    getWalletInfo(): WalletInfo | null {
        return this.walletInfo;
    }

    /**
     * Disconnect wallet
     */
    disconnect(): void {
        this.provider = null;
        this.signer = null;
        this.walletInfo = null;
    }
}

// Singleton instance
export const blockchainService = new BlockchainService();

// Extend Window interface for TypeScript
declare global {
    interface Window {
        ethereum?: any;
    }
}
