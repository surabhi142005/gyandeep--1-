// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GradingSystem
 * @dev Transparent and immutable grading records
 */
contract GradingSystem is Ownable {
    struct Grade {
        string studentId;
        string quizId;
        string subject;
        uint256 score;
        uint256 maxScore;
        uint256 timestamp;
        string teacherId;
    }

    mapping(uint256 => Grade) public grades;
    mapping(string => uint256[]) public studentGrades;
    mapping(string => uint256[]) public quizGrades;
    
    uint256 public gradeCount;

    event GradeRecorded(
        uint256 indexed gradeId,
        string studentId,
        string quizId,
        string subject,
        uint256 score,
        uint256 maxScore
    );

    constructor() Ownable(msg.sender) {
        gradeCount = 0;
    }

    /**
     * @dev Record a grade on blockchain
     */
    function recordGrade(
        string memory studentId,
        string memory quizId,
        string memory subject,
        uint256 score,
        uint256 maxScore,
        string memory teacherId
    ) public onlyOwner returns (uint256) {
        require(score <= maxScore, "Score cannot exceed max score");
        
        gradeCount++;
        
        grades[gradeCount] = Grade({
            studentId: studentId,
            quizId: quizId,
            subject: subject,
            score: score,
            maxScore: maxScore,
            timestamp: block.timestamp,
            teacherId: teacherId
        });

        studentGrades[studentId].push(gradeCount);
        quizGrades[quizId].push(gradeCount);

        emit GradeRecorded(gradeCount, studentId, quizId, subject, score, maxScore);
        
        return gradeCount;
    }

    /**
     * @dev Get grade record by ID
     */
    function getGrade(uint256 gradeId) 
        public 
        view 
        returns (
            string memory studentId,
            string memory quizId,
            string memory subject,
            uint256 score,
            uint256 maxScore,
            uint256 timestamp,
            string memory teacherId
        ) 
    {
        require(gradeId > 0 && gradeId <= gradeCount, "Invalid grade ID");
        Grade memory grade = grades[gradeId];
        return (
            grade.studentId,
            grade.quizId,
            grade.subject,
            grade.score,
            grade.maxScore,
            grade.timestamp,
            grade.teacherId
        );
    }

    /**
     * @dev Get all grade IDs for a student
     */
    function getStudentGradeHistory(string memory studentId) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return studentGrades[studentId];
    }

    /**
     * @dev Get all grade IDs for a quiz
     */
    function getQuizGrades(string memory quizId) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return quizGrades[quizId];
    }

    /**
     * @dev Calculate average score for a student
     */
    function getStudentAverage(string memory studentId) 
        public 
        view 
        returns (uint256 average, uint256 totalGrades) 
    {
        uint256[] memory gradeIds = studentGrades[studentId];
        totalGrades = gradeIds.length;
        
        if (totalGrades == 0) {
            return (0, 0);
        }

        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < totalGrades; i++) {
            Grade memory grade = grades[gradeIds[i]];
            totalPercentage += (grade.score * 100) / grade.maxScore;
        }

        average = totalPercentage / totalGrades;
        return (average, totalGrades);
    }
}
