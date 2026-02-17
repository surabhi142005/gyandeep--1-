const hre = require("hardhat");

async function main() {
    console.log("Deploying Gyandeep Smart Contracts...");

    // Deploy AttendanceRecord
    console.log("\n1. Deploying AttendanceRecord...");
    const AttendanceRecord = await hre.ethers.getContractFactory("AttendanceRecord");
    const attendanceRecord = await AttendanceRecord.deploy();
    await attendanceRecord.waitForDeployment();
    const attendanceAddress = await attendanceRecord.getAddress();
    console.log("✓ AttendanceRecord deployed to:", attendanceAddress);

    // Deploy AcademicCredentials
    console.log("\n2. Deploying AcademicCredentials...");
    const AcademicCredentials = await hre.ethers.getContractFactory("AcademicCredentials");
    const academicCredentials = await AcademicCredentials.deploy();
    await academicCredentials.waitForDeployment();
    const credentialsAddress = await academicCredentials.getAddress();
    console.log("✓ AcademicCredentials deployed to:", credentialsAddress);

    // Deploy GradingSystem
    console.log("\n3. Deploying GradingSystem...");
    const GradingSystem = await hre.ethers.getContractFactory("GradingSystem");
    const gradingSystem = await GradingSystem.deploy();
    await gradingSystem.waitForDeployment();
    const gradingAddress = await gradingSystem.getAddress();
    console.log("✓ GradingSystem deployed to:", gradingAddress);

    // Save deployment addresses
    const fs = require("fs");
    const deploymentInfo = {
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        contracts: {
            AttendanceRecord: attendanceAddress,
            AcademicCredentials: credentialsAddress,
            GradingSystem: gradingAddress
        },
        timestamp: new Date().toISOString()
    };

    const deploymentsDir = "./deployments";
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    fs.writeFileSync(
        `${deploymentsDir}/${hre.network.name}.json`,
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n✓ Deployment info saved to deployments/" + hre.network.name + ".json");
    console.log("\n=== Deployment Summary ===");
    console.log("Network:", hre.network.name);
    console.log("Chain ID:", hre.network.config.chainId);
    console.log("\nContract Addresses:");
    console.log("- AttendanceRecord:", attendanceAddress);
    console.log("- AcademicCredentials:", credentialsAddress);
    console.log("- GradingSystem:", gradingAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
