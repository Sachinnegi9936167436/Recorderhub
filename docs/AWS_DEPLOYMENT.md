# RecordHub: AWS Production Deployment Architecture

## Infrastructure Overview
RecordHub deploys to AWS India (`ap-south-1` Mumbai) using containerized services on ECS Fargate, MongoDB Atlas (or self-managed EC2 Replica Set), AWS ElastiCache for Redis, and AWS S3 with SSE-KMS encryption.

```
                                    +-----------------------+
                                    |     CloudFront CDN    |
                                    +-----------+-----------+
                                                |
                                    +-----------v-----------+
                                    | AWS Application Load  |
                                    |      Balancer (ALB)   |
                                    +-----------+-----------+
                                                |
                     +--------------------------+--------------------------+
                     |                                                     |
         +-----------v-----------+                             +-----------v-----------+
         | ECS Fargate Next.js   |                             |  ECS Fargate NestJS   |
         |    Dashboard App      |                             |     API Gateway       |
         +-----------------------+                             +-----------+-----------+
                                                                           |
                                                               +-----------v-----------+
                                                               |  ECS Fargate Worker   |
                                                               |      Nodes (BullMQ)   |
                                                               +-----------+-----------+
                                                                           |
         +-----------------------+----------+------------------------------+
         |                       |          |                              |
+--------v-------+       +-------v----+  +--v-------------+     +----------v----------+
| MongoDB Atlas  |       | ElastiCache|  |  AWS S3 Bucket |     | AWS KMS (Dedicated  |
|  Replica Set   |       |   Redis    |  |  (Private)     |     |  Customer Key)      |
+----------------+       +------------+  +----------------+     +---------------------+
```

---

## Key Security Infrastructure Settings
1. **S3 Bucket Configuration**:
   - `BlockPublicAcls: true`
   - `BlockPublicPolicy: true`
   - `IgnorePublicAcls: true`
   - `RestrictPublicBuckets: true`
   - `BucketKeyEnabled: true` (SSE-KMS Encryption)
2. **KMS Key Management**:
   - Customer Managed Key (CMK) with annual key rotation enabled.
   - Restricted Key Policy limiting decryption rights exclusively to API Fargate IAM Roles.
