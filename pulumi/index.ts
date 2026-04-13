import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const stackName = pulumi.getStack();
const projectName = "balentinetech";

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

// Allow public access so the static site is reachable
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
        policy: frontendBucket.id.apply((bucketName) =>
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
// BACKEND: Security Group for API Access
// ============================================================

const backendSg = new aws.ec2.SecurityGroup(`${projectName}-backend-sg`, {
    description: "Balentine Tech Solutions — backend API access rules",
    ingress: [
        {
            description: "HTTP",
            protocol: "tcp",
            fromPort: 80,
            toPort: 80,
            cidrBlocks: ["0.0.0.0/0"],
        },
        {
            description: "HTTPS",
            protocol: "tcp",
            fromPort: 443,
            toPort: 443,
            cidrBlocks: ["0.0.0.0/0"],
        },
        {
            description: "Node.js API port",
            protocol: "tcp",
            fromPort: 3001,
            toPort: 3001,
            cidrBlocks: ["0.0.0.0/0"],
        },
    ],
    egress: [
        {
            description: "Allow all outbound",
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

// ============================================================
// MONITORING: SNS + CloudWatch Alarms
// ============================================================

const alertTopic = new aws.sns.Topic(`${projectName}-alerts`, {
    name: `${projectName}-pulumi-alerts`,
    tags: {
        Project: "BalentineTechSolutions",
        ManagedBy: "Pulumi",
    },
});

// Alert when Elastic Beanstalk CPU exceeds 70% for two 5-minute periods
const highCpuAlarm = new aws.cloudwatch.MetricAlarm(`${projectName}-high-cpu`, {
    alarmDescription: "Beanstalk CPU exceeded 70% for 10 minutes",
    comparisonOperator: "GreaterThanThreshold",
    evaluationPeriods: 2,
    metricName: "CPUUtilization",
    namespace: "AWS/ElasticBeanstalk",
    period: 300,
    statistic: "Average",
    threshold: 70,
    alarmActions: [alertTopic.arn],
    dimensions: {
        EnvironmentName: "Balentinetech-backend-env",
    },
    tags: {
        Project: "BalentineTechSolutions",
        ManagedBy: "Pulumi",
    },
});

// Alert on any 5XX errors in Elastic Beanstalk
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
    dimensions: {
        EnvironmentName: "Balentinetech-backend-env",
    },
    tags: {
        Project: "BalentineTechSolutions",
        ManagedBy: "Pulumi",
    },
});

// Alert when RDS has no active connections for two 5-minute periods
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
        dimensions: {
            DBInstanceIdentifier: "database-1",
        },
        tags: {
            Project: "BalentineTechSolutions",
            ManagedBy: "Pulumi",
        },
    }
);

// ============================================================
// EXPORTS — referenced by GitHub Actions and documentation
// ============================================================

export const frontendBucketName = frontendBucket.id;
export const frontendWebsiteUrl = websiteConfig.websiteEndpoint;
export const backendSecurityGroupId = backendSg.id;
export const alertTopicArn = alertTopic.arn;
