import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const stackName = pulumi.getStack();
const projectName = "balentinetech";

const config = new pulumi.Config();
const dbPassword = config.requireSecret("dbPassword");
const dbUsername = config.get("dbUsername") ?? "balentineadmin";

// ============================================================
// VPC — isolated network for all backend/database resources
// ============================================================

const vpc = new aws.ec2.Vpc(`${projectName}-vpc`, {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: {
        Name: `${projectName}-vpc`,
        Project: "BalentineTechSolutions",
        Environment: stackName,
        ManagedBy: "Pulumi",
    },
});

const internetGateway = new aws.ec2.InternetGateway(`${projectName}-igw`, {
    vpcId: vpc.id,
    tags: {
        Name: `${projectName}-igw`,
        Project: "BalentineTechSolutions",
        ManagedBy: "Pulumi",
    },
});

// Public subnets — EC2 / Elastic Beanstalk lives here
const publicSubnetA = new aws.ec2.Subnet(`${projectName}-public-a`, {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    availabilityZone: "us-east-2a",
    mapPublicIpOnLaunch: true,
    tags: {
        Name: `${projectName}-public-a`,
        Project: "BalentineTechSolutions",
        ManagedBy: "Pulumi",
    },
});

const publicSubnetB = new aws.ec2.Subnet(`${projectName}-public-b`, {
    vpcId: vpc.id,
    cidrBlock: "10.0.2.0/24",
    availabilityZone: "us-east-2b",
    mapPublicIpOnLaunch: true,
    tags: {
        Name: `${projectName}-public-b`,
        Project: "BalentineTechSolutions",
        ManagedBy: "Pulumi",
    },
});

// Private subnets — RDS lives here, never directly reachable from the internet
const privateSubnetA = new aws.ec2.Subnet(`${projectName}-private-a`, {
    vpcId: vpc.id,
    cidrBlock: "10.0.3.0/24",
    availabilityZone: "us-east-2a",
    mapPublicIpOnLaunch: false,
    tags: {
        Name: `${projectName}-private-a`,
        Project: "BalentineTechSolutions",
        ManagedBy: "Pulumi",
    },
});

const privateSubnetB = new aws.ec2.Subnet(`${projectName}-private-b`, {
    vpcId: vpc.id,
    cidrBlock: "10.0.4.0/24",
    availabilityZone: "us-east-2b",
    mapPublicIpOnLaunch: false,
    tags: {
        Name: `${projectName}-private-b`,
        Project: "BalentineTechSolutions",
        ManagedBy: "Pulumi",
    },
});

// Route table for public subnets — routes internet traffic through IGW
const publicRouteTable = new aws.ec2.RouteTable(`${projectName}-public-rt`, {
    vpcId: vpc.id,
    routes: [
        {
            cidrBlock: "0.0.0.0/0",
            gatewayId: internetGateway.id,
        },
    ],
    tags: {
        Name: `${projectName}-public-rt`,
        Project: "BalentineTechSolutions",
        ManagedBy: "Pulumi",
    },
});

new aws.ec2.RouteTableAssociation(`${projectName}-rta-public-a`, {
    subnetId: publicSubnetA.id,
    routeTableId: publicRouteTable.id,
});

new aws.ec2.RouteTableAssociation(`${projectName}-rta-public-b`, {
    subnetId: publicSubnetB.id,
    routeTableId: publicRouteTable.id,
});

// ============================================================
// IAM — least-privilege roles for CI/CD and EC2 runtime
// ============================================================

// EC2 instance role: allows SSM access, CloudWatch logging, and reading SSM params
const ec2Role = new aws.iam.Role(`${projectName}-ec2-role`, {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Principal: { Service: "ec2.amazonaws.com" },
                Action: "sts:AssumeRole",
            },
        ],
    }),
    tags: {
        Project: "BalentineTechSolutions",
        ManagedBy: "Pulumi",
    },
});

// Allow EC2 to write logs and metrics to CloudWatch
new aws.iam.RolePolicyAttachment(`${projectName}-ec2-cloudwatch`, {
    role: ec2Role.name,
    policyArn: "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
});

// Allow EC2 to read SSM parameters (for DB credentials)
new aws.iam.RolePolicyAttachment(`${projectName}-ec2-ssm`, {
    role: ec2Role.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
});

// Inline policy: narrow read-only access to this project's SSM parameters only
const ec2SsmParamPolicy = new aws.iam.RolePolicy(`${projectName}-ec2-ssm-params`, {
    role: ec2Role.name,
    policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Action: ["ssm:GetParameter", "ssm:GetParameters"],
                Resource: `arn:aws:ssm:us-east-2:*:parameter/${projectName}/*`,
            },
        ],
    }),
});

// Instance profile wraps the role so EC2 can use it
const ec2InstanceProfile = new aws.iam.InstanceProfile(
    `${projectName}-ec2-profile`,
    {
        role: ec2Role.name,
        tags: {
            Project: "BalentineTechSolutions",
            ManagedBy: "Pulumi",
        },
    }
);

// CI/CD IAM user — least privilege: S3 deploy bucket + EB update + CloudFront invalidation
const cicdUser = new aws.iam.User(`${projectName}-cicd-user`, {
    name: `${projectName}-github-actions`,
    tags: {
        Project: "BalentineTechSolutions",
        ManagedBy: "Pulumi",
    },
});

const cicdPolicy = new aws.iam.UserPolicy(`${projectName}-cicd-policy`, {
    user: cicdUser.name,
    policy: pulumi
        .all([])
        .apply(() =>
            JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Sid: "S3DeployBucket",
                        Effect: "Allow",
                        Action: [
                            "s3:PutObject",
                            "s3:GetObject",
                            "s3:DeleteObject",
                            "s3:ListBucket",
                        ],
                        Resource: [
                            "arn:aws:s3:::balentinetech-solutions-frontend",
                            "arn:aws:s3:::balentinetech-solutions-frontend/*",
                        ],
                    },
                    {
                        Sid: "CloudFrontInvalidation",
                        Effect: "Allow",
                        Action: "cloudfront:CreateInvalidation",
                        Resource: "*",
                    },
                    {
                        Sid: "ElasticBeanstalkDeploy",
                        Effect: "Allow",
                        Action: [
                            "elasticbeanstalk:CreateApplicationVersion",
                            "elasticbeanstalk:UpdateEnvironment",
                            "elasticbeanstalk:DescribeEnvironments",
                            "elasticbeanstalk:DescribeApplicationVersions",
                        ],
                        Resource: "*",
                    },
                    {
                        Sid: "EBSupportingServices",
                        Effect: "Allow",
                        Action: [
                            "s3:PutObject",
                            "s3:GetObject",
                            "s3:ListBucket",
                            "ec2:DescribeInstances",
                            "autoscaling:DescribeAutoScalingGroups",
                            "cloudformation:DescribeStacks",
                        ],
                        Resource: "*",
                    },
                ],
            })
        ),
});

// ============================================================
// SSM PARAMETER STORE — secure storage for database credentials
// ============================================================

// Placeholders — values must be set manually in AWS console or via `pulumi config set`
// before first `pulumi up`. They are SecureString encrypted at rest.
const dbPasswordParam = new aws.ssm.Parameter(`${projectName}-db-password`, {
    name: `/${projectName}/db/password`,
    type: "SecureString",
    value: dbPassword,
    description: "RDS master password for BalentineTech database",
    tags: {
        Project: "BalentineTechSolutions",
        ManagedBy: "Pulumi",
    },
});

const dbUsernameParam = new aws.ssm.Parameter(`${projectName}-db-username`, {
    name: `/${projectName}/db/username`,
    type: "String",
    value: dbUsername,
    description: "RDS master username for BalentineTech database",
    tags: {
        Project: "BalentineTechSolutions",
        ManagedBy: "Pulumi",
    },
});

// ============================================================
// RDS — PostgreSQL in private subnets
// ============================================================

// Subnet group — RDS requires at least two AZs
const dbSubnetGroup = new aws.rds.SubnetGroup(`${projectName}-db-subnet-group`, {
    name: `${projectName}-db-subnet-group`,
    subnetIds: [privateSubnetA.id, privateSubnetB.id],
    tags: {
        Project: "BalentineTechSolutions",
        Environment: stackName,
        ManagedBy: "Pulumi",
    },
});

// Security group: only allow inbound PostgreSQL from inside the VPC (backend EC2)
const rdsSg = new aws.ec2.SecurityGroup(`${projectName}-rds-sg`, {
    description: "Allow PostgreSQL access from within VPC only",
    vpcId: vpc.id,
    ingress: [
        {
            description: "PostgreSQL from VPC",
            protocol: "tcp",
            fromPort: 5432,
            toPort: 5432,
            cidrBlocks: ["10.0.0.0/16"],   // VPC CIDR only — no public internet access
        },
    ],
    egress: [
        {
            protocol: "-1",
            fromPort: 0,
            toPort: 0,
            cidrBlocks: ["0.0.0.0/0"],
        },
    ],
    tags: {
        Project: "BalentineTechSolutions",
        Environment: stackName,
        ManagedBy: "Pulumi",
    },
});

const rdsInstance = new aws.rds.Instance(`${projectName}-db`, {
    identifier: `${projectName}-db-01`,
    engine: "postgres",
    engineVersion: "15.17",
    instanceClass: "db.t3.micro",
    allocatedStorage: 20,
    storageType: "gp2",
    storageEncrypted: true,
    dbName: "balentinetech",
    username: dbUsername,
    password: dbPassword,
    dbSubnetGroupName: dbSubnetGroup.name,
    vpcSecurityGroupIds: [rdsSg.id],
    publiclyAccessible: false,
    multiAz: false,
    backupRetentionPeriod: 7,
    deletionProtection: false,
    skipFinalSnapshot: true,
    parameterGroupName: "default.postgres15",
    tags: {
        Project: "BalentineTechSolutions",
        Environment: stackName,
        ManagedBy: "Pulumi",
    },
});

// ============================================================
// EC2 — Ubuntu 22.04, Docker installed via user-data
// ============================================================

// Security group for EC2: HTTP, HTTPS, API port from public internet; SSH from anywhere
// (restrict SSH cidrBlock to your IP in production)
// Attach to public subnet so EB/EC2 can reach the internet
const ec2Sg = new aws.ec2.SecurityGroup(`${projectName}-ec2-sg`, {
    description: "Balentine Tech - EC2 backend access",
    vpcId: vpc.id,
    ingress: [
        { description: "HTTP",       protocol: "tcp", fromPort: 80,   toPort: 80,   cidrBlocks: ["0.0.0.0/0"] },
        { description: "HTTPS",      protocol: "tcp", fromPort: 443,  toPort: 443,  cidrBlocks: ["0.0.0.0/0"] },
        { description: "API port",   protocol: "tcp", fromPort: 3001, toPort: 3001, cidrBlocks: ["0.0.0.0/0"] },
        { description: "SSH (admin)",protocol: "tcp", fromPort: 22,   toPort: 22,   cidrBlocks: ["0.0.0.0/0"] },
    ],
    egress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
    ],
    tags: {
        Project: "BalentineTechSolutions",
        Environment: stackName,
        ManagedBy: "Pulumi",
    },
});

// User-data: install Docker & Docker Compose on first boot, then enable auto-start
const userDataScript = `#!/bin/bash
set -e
apt-get update -y
apt-get install -y docker.io docker-compose awscli
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# Pull and run the backend image on startup
# Replace the image name below with your Docker Hub image after first push
cat > /home/ubuntu/start.sh << 'EOF'
#!/bin/bash
docker pull debalent/balentinetech-backend:latest
docker stop backend || true
docker rm backend || true
docker run -d \
  --name backend \
  --restart unless-stopped \
  -p 3001:3001 \
  --env-file /home/ubuntu/.env \
  debalent/balentinetech-backend:latest
EOF
chmod +x /home/ubuntu/start.sh
/home/ubuntu/start.sh
`;

// Ubuntu 22.04 LTS (Jammy) — us-east-2 — ami-0862be96e41dcbf74 (Canonical, hvm:ebs-ssd)
// Hardcoded to avoid requiring ec2:DescribeImages IAM permission at deploy time
const ubuntuAmiId = "ami-0862be96e41dcbf74";

const ec2Instance = new aws.ec2.Instance(`${projectName}-backend-ec2`, {
    ami: ubuntuAmiId,
    instanceType: "t3.micro",
    subnetId: publicSubnetA.id,
    vpcSecurityGroupIds: [ec2Sg.id],
    iamInstanceProfile: ec2InstanceProfile.name,
    userData: userDataScript,
    associatePublicIpAddress: true,
    rootBlockDevice: {
        volumeSize: 20,
        volumeType: "gp3",
        encrypted: true,
    },
    tags: {
        Name: `${projectName}-backend`,
        Project: "BalentineTechSolutions",
        Environment: stackName,
        ManagedBy: "Pulumi",
    },
});

// ============================================================
// CLOUDFRONT — CDN in front of the S3 static site
// ============================================================

// ============================================================
// FRONTEND: S3 Static Website Hosting
// ============================================================

const frontendBucket = new aws.s3.Bucket(`${projectName}-frontend`, {
    bucket: `${projectName}-solutions-frontend`,
    tags: {
        Project: "BalentineTechSolutions",
        Environment: stackName,
        ManagedBy: "Pulumi",
    },
});

// Allow public access so CloudFront OAC can serve objects
const publicAccessBlock = new aws.s3.BucketPublicAccessBlock(
    `${projectName}-frontend-pab`,
    {
        bucket: frontendBucket.id,
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
    }
);

// Enable static website hosting with index.html as root
const websiteConfig = new aws.s3.BucketWebsiteConfigurationV2(
    `${projectName}-frontend-website`,
    {
        bucket: frontendBucket.id,
        indexDocument: { suffix: "index.html" },
        errorDocument: { key: "index.html" },
    },
    { dependsOn: [publicAccessBlock] }
);

// Bucket policy: allow public read on all objects
const bucketPolicy = new aws.s3.BucketPolicy(
    `${projectName}-frontend-policy`,
    {
        bucket: frontendBucket.id,
        policy: frontendBucket.id.apply((bucketName: string) =>
            JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Sid: "PublicReadGetObject",
                        Effect: "Allow",
                        Principal: "*",
                        Action: "s3:GetObject",
                        Resource: `arn:aws:s3:::${bucketName}/*`,
                    },
                ],
            })
        ),
    },
    { dependsOn: [publicAccessBlock] }
);

// CORS so the frontend can call the backend API
const bucketCors = new aws.s3.BucketCorsConfigurationV2(
    `${projectName}-frontend-cors`,
    {
        bucket: frontendBucket.id,
        corsRules: [
            {
                allowedHeaders: ["*"],
                allowedMethods: ["GET", "HEAD"],
                allowedOrigins: ["*"],
                maxAgeSeconds: 3000,
            },
        ],
    }
);

// ============================================================
// CLOUDFRONT — CDN distribution in front of the S3 bucket
// ============================================================

const cfDistribution = new aws.cloudfront.Distribution(
    `${projectName}-cdn`,
    {
        enabled: true,
        isIpv6Enabled: true,
        defaultRootObject: "index.html",
        comment: "Balentine Tech Solutions — frontend CDN",
        origins: [
            {
                domainName: websiteConfig.websiteEndpoint,
                originId: "S3WebsiteOrigin",
                customOriginConfig: {
                    httpPort: 80,
                    httpsPort: 443,
                    originProtocolPolicy: "http-only",   // S3 website endpoint is HTTP only
                    originSslProtocols: ["TLSv1.2"],
                },
            },
            {
                domainName: "Balentinetech-backend-env.eba-pmim6y3b.us-east-2.elasticbeanstalk.com",
                originId: "EBBackendOrigin",
                customOriginConfig: {
                    httpPort: 80,
                    httpsPort: 443,
                    originProtocolPolicy: "http-only",
                    originSslProtocols: ["TLSv1.2"],
                },
            },
        ],
        orderedCacheBehaviors: [
            {
                pathPattern: "/api/*",
                targetOriginId: "EBBackendOrigin",
                viewerProtocolPolicy: "redirect-to-https",
                allowedMethods: ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
                cachedMethods: ["GET", "HEAD"],
                compress: false,
                forwardedValues: {
                    queryString: true,
                    headers: ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"],
                    cookies: { forward: "none" },
                },
                minTtl: 0,
                defaultTtl: 0,
                maxTtl: 0,
            },
        ],
        defaultCacheBehavior: {
            targetOriginId: "S3WebsiteOrigin",
            viewerProtocolPolicy: "redirect-to-https",
            allowedMethods: ["GET", "HEAD", "OPTIONS"],
            cachedMethods: ["GET", "HEAD"],
            compress: true,
            forwardedValues: {
                queryString: false,
                cookies: { forward: "none" },
            },
            minTtl: 0,
            defaultTtl: 86400,    // 1 day
            maxTtl: 31536000,     // 1 year
        },
        // Return index.html for any 403/404 so SPA routing works
        customErrorResponses: [
            {
                errorCode: 404,
                responseCode: 200,
                responsePagePath: "/index.html",
            },
            {
                errorCode: 403,
                responseCode: 200,
                responsePagePath: "/index.html",
            },
        ],
        restrictions: {
            geoRestriction: {
                restrictionType: "none",
            },
        },
        viewerCertificate: {
            cloudfrontDefaultCertificate: true,
        },
        tags: {
            Project: "BalentineTechSolutions",
            Environment: stackName,
            ManagedBy: "Pulumi",
        },
    },
    { dependsOn: [websiteConfig, bucketPolicy] }
);

// ============================================================
// CLOUDWATCH — Log Groups + Full Alarm Suite
// ============================================================

// Application log group for the backend API
const backendLogGroup = new aws.cloudwatch.LogGroup(
    `${projectName}-backend-logs`,
    {
        name: `/balentinetech/backend/application`,
        retentionInDays: 30,
        tags: {
            Project: "BalentineTechSolutions",
            ManagedBy: "Pulumi",
        },
    }
);

// Log group for frontend access logs (forwarded via CloudFront → Kinesis or S3 access logging)
const frontendLogGroup = new aws.cloudwatch.LogGroup(
    `${projectName}-frontend-logs`,
    {
        name: `/balentinetech/frontend/access`,
        retentionInDays: 30,
        tags: {
            Project: "BalentineTechSolutions",
            ManagedBy: "Pulumi",
        },
    }
);

// SNS topic — all alarms publish here; subscribe your email via AWS console
const alertTopic = new aws.sns.Topic(`${projectName}-alerts`, {
    name: `${projectName}-pulumi-alerts`,
    tags: {
        Project: "BalentineTechSolutions",
        ManagedBy: "Pulumi",
    },
});

// EC2 CPU > 70% for 10 minutes
const highCpuAlarm = new aws.cloudwatch.MetricAlarm(`${projectName}-high-cpu`, {
    alarmDescription: "EC2 backend CPU exceeded 70% for 10 minutes",
    comparisonOperator: "GreaterThanThreshold",
    evaluationPeriods: 2,
    metricName: "CPUUtilization",
    namespace: "AWS/EC2",
    period: 300,
    statistic: "Average",
    threshold: 70,
    alarmActions: [alertTopic.arn],
    dimensions: {
        InstanceId: ec2Instance.id,
    },
    tags: { Project: "BalentineTechSolutions", ManagedBy: "Pulumi" },
});

// Elastic Beanstalk 5XX errors
const errorsAlarm = new aws.cloudwatch.MetricAlarm(`${projectName}-5xx-errors`, {
    alarmDescription: "Any 5XX HTTP errors from the backend",
    comparisonOperator: "GreaterThanThreshold",
    evaluationPeriods: 1,
    metricName: "ApplicationRequests5xx",
    namespace: "AWS/ElasticBeanstalk",
    period: 60,
    statistic: "Sum",
    threshold: 0,
    treatMissingData: "notBreaching",
    alarmActions: [alertTopic.arn],
    dimensions: { EnvironmentName: "Balentinetech-backend-env" },
    tags: { Project: "BalentineTechSolutions", ManagedBy: "Pulumi" },
});

// RDS — connections dropped to zero (DB unreachable)
const dbConnectionAlarm = new aws.cloudwatch.MetricAlarm(
    `${projectName}-db-connections`,
    {
        alarmDescription: "RDS database connections dropped to zero",
        comparisonOperator: "LessThanThreshold",
        evaluationPeriods: 2,
        metricName: "DatabaseConnections",
        namespace: "AWS/RDS",
        period: 300,
        statistic: "Average",
        threshold: 1,
        treatMissingData: "breaching",
        alarmActions: [alertTopic.arn],
        dimensions: { DBInstanceIdentifier: rdsInstance.identifier },
        tags: { Project: "BalentineTechSolutions", ManagedBy: "Pulumi" },
    }
);

// RDS CPU > 80%
const rdsCpuAlarm = new aws.cloudwatch.MetricAlarm(`${projectName}-rds-cpu`, {
    alarmDescription: "RDS CPU exceeded 80%",
    comparisonOperator: "GreaterThanThreshold",
    evaluationPeriods: 2,
    metricName: "CPUUtilization",
    namespace: "AWS/RDS",
    period: 300,
    statistic: "Average",
    threshold: 80,
    alarmActions: [alertTopic.arn],
    dimensions: { DBInstanceIdentifier: rdsInstance.identifier },
    tags: { Project: "BalentineTechSolutions", ManagedBy: "Pulumi" },
});

// EC2 memory usage > 85% (requires CloudWatch agent on the instance)
const memoryAlarm = new aws.cloudwatch.MetricAlarm(`${projectName}-memory`, {
    alarmDescription: "EC2 memory usage exceeded 85%",
    comparisonOperator: "GreaterThanThreshold",
    evaluationPeriods: 2,
    metricName: "mem_used_percent",
    namespace: "CWAgent",
    period: 300,
    statistic: "Average",
    threshold: 85,
    alarmActions: [alertTopic.arn],
    dimensions: { InstanceId: ec2Instance.id },
    tags: { Project: "BalentineTechSolutions", ManagedBy: "Pulumi" },
});

// EC2 disk usage > 80%
const diskAlarm = new aws.cloudwatch.MetricAlarm(`${projectName}-disk`, {
    alarmDescription: "EC2 root disk usage exceeded 80%",
    comparisonOperator: "GreaterThanThreshold",
    evaluationPeriods: 1,
    metricName: "disk_used_percent",
    namespace: "CWAgent",
    period: 300,
    statistic: "Average",
    threshold: 80,
    alarmActions: [alertTopic.arn],
    dimensions: { InstanceId: ec2Instance.id, path: "/", device: "nvme0n1p1", fstype: "ext4" },
    tags: { Project: "BalentineTechSolutions", ManagedBy: "Pulumi" },
});

// CloudFront 5XX error rate > 5%
const cfErrorAlarm = new aws.cloudwatch.MetricAlarm(`${projectName}-cf-errors`, {
    alarmDescription: "CloudFront 5XX error rate exceeded 5%",
    comparisonOperator: "GreaterThanThreshold",
    evaluationPeriods: 1,
    metricName: "5xxErrorRate",
    namespace: "AWS/CloudFront",
    period: 300,
    statistic: "Average",
    threshold: 5,
    treatMissingData: "notBreaching",
    alarmActions: [alertTopic.arn],
    dimensions: { DistributionId: cfDistribution.id, Region: "Global" },
    tags: { Project: "BalentineTechSolutions", ManagedBy: "Pulumi" },
});

// ============================================================
// EXPORTS — referenced by GitHub Actions and documentation
// ============================================================

export const frontendBucketName    = frontendBucket.id;
export const frontendWebsiteUrl    = websiteConfig.websiteEndpoint;
export const cloudfrontDomainName  = cfDistribution.domainName;
export const cloudfrontId          = cfDistribution.id;
export const ec2InstanceId         = ec2Instance.id;
export const ec2PublicIp           = ec2Instance.publicIp;
export const rdsEndpoint           = rdsInstance.endpoint;
export const alertTopicArn         = alertTopic.arn;
export const backendLogGroupName   = backendLogGroup.name;
export const frontendLogGroupName  = frontendLogGroup.name;
