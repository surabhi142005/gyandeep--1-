// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AcademicCredentials
 * @dev NFT-based academic certificates and credentials
 */
contract AcademicCredentials is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;

    struct Certificate {
        string studentId;
        string courseId;
        string courseName;
        uint256 issueDate;
        string grade;
        bool revoked;
    }

    mapping(uint256 => Certificate) public certificates;
    mapping(string => uint256[]) public studentCertificates;

    event CertificateIssued(
        uint256 indexed tokenId,
        string studentId,
        string courseId,
        string courseName,
        string grade
    );

    event CertificateRevoked(uint256 indexed tokenId);

    constructor() ERC721("Gyandeep Certificate", "GYAN") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }

    /**
     * @dev Issue a new certificate as NFT
     * @param to Address to receive the certificate
     * @param studentId Student identifier
     * @param courseId Course identifier
     * @param courseName Name of the course
     * @param grade Grade achieved
     * @param metadataURI IPFS URI containing certificate metadata
     */
    function issueCertificate(
        address to,
        string memory studentId,
        string memory courseId,
        string memory courseName,
        string memory grade,
        string memory metadataURI
    ) public onlyOwner returns (uint256) {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        certificates[tokenId] = Certificate({
            studentId: studentId,
            courseId: courseId,
            courseName: courseName,
            issueDate: block.timestamp,
            grade: grade,
            revoked: false
        });

        studentCertificates[studentId].push(tokenId);

        emit CertificateIssued(tokenId, studentId, courseId, courseName, grade);

        return tokenId;
    }

    /**
     * @dev Revoke a certificate (mark as invalid)
     */
    function revokeCertificate(uint256 tokenId) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Certificate does not exist");
        certificates[tokenId].revoked = true;
        emit CertificateRevoked(tokenId);
    }

    /**
     * @dev Verify certificate authenticity
     */
    function verifyCertificate(uint256 tokenId) 
        public 
        view 
        returns (
            bool exists,
            bool valid,
            string memory studentId,
            string memory courseName,
            string memory grade,
            uint256 issueDate
        ) 
    {
        exists = _ownerOf(tokenId) != address(0);
        if (!exists) {
            return (false, false, "", "", "", 0);
        }

        Certificate memory cert = certificates[tokenId];
        valid = !cert.revoked;

        return (
            exists,
            valid,
            cert.studentId,
            cert.courseName,
            cert.grade,
            cert.issueDate
        );
    }

    /**
     * @dev Get all certificates for a student
     */
    function getStudentCertificates(string memory studentId) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return studentCertificates[studentId];
    }

    // Override required functions
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
