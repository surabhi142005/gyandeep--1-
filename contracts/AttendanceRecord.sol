// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AttendanceRecord
 * @dev Immutable attendance tracking on blockchain
 */
contract AttendanceRecord is Ownable {
    struct Attendance {
        string studentId;
        string classId;
        uint256 timestamp;
        string location; // Geolocation coordinates as string
        bool verified;
    }

    // Mapping from record ID to Attendance
    mapping(uint256 => Attendance) public attendanceRecords;
    
    // Mapping from studentId to array of their record IDs
    mapping(string => uint256[]) public studentAttendanceHistory;
    
    uint256 public recordCount;

    event AttendanceRecorded(
        uint256 indexed recordId,
        string studentId,
        string classId,
        uint256 timestamp,
        string location
    );

    event AttendanceVerified(uint256 indexed recordId);

    constructor() Ownable(msg.sender) {
        recordCount = 0;
    }

    /**
     * @dev Record attendance on blockchain
     */
    function recordAttendance(
        string memory studentId,
        string memory classId,
        uint256 timestamp,
        string memory location
    ) public onlyOwner returns (uint256) {
        recordCount++;
        
        attendanceRecords[recordCount] = Attendance({
            studentId: studentId,
            classId: classId,
            timestamp: timestamp,
            location: location,
            verified: false
        });

        studentAttendanceHistory[studentId].push(recordCount);

        emit AttendanceRecorded(recordCount, studentId, classId, timestamp, location);
        
        return recordCount;
    }

    /**
     * @dev Verify an attendance record
     */
    function verifyAttendance(uint256 recordId) public onlyOwner {
        require(recordId > 0 && recordId <= recordCount, "Invalid record ID");
        attendanceRecords[recordId].verified = true;
        emit AttendanceVerified(recordId);
    }

    /**
     * @dev Get attendance record by ID
     */
    function getAttendanceRecord(uint256 recordId) 
        public 
        view 
        returns (
            string memory studentId,
            string memory classId,
            uint256 timestamp,
            string memory location,
            bool verified
        ) 
    {
        require(recordId > 0 && recordId <= recordCount, "Invalid record ID");
        Attendance memory record = attendanceRecords[recordId];
        return (
            record.studentId,
            record.classId,
            record.timestamp,
            record.location,
            record.verified
        );
    }

    /**
     * @dev Get all attendance record IDs for a student
     */
    function getStudentAttendanceHistory(string memory studentId) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return studentAttendanceHistory[studentId];
    }
}
