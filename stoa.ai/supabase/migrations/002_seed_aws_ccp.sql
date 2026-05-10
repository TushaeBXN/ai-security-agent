-- Seed: AWS Cloud Practitioner (CLF-C02)

insert into certifications (id, name, slug, provider, level) values
  ('11111111-0000-0000-0000-000000000001', 'AWS Certified Cloud Practitioner', 'aws-cloud-practitioner', 'AWS', 'foundational'),
  ('11111111-0000-0000-0000-000000000002', 'AWS Certified Solutions Architect – Associate', 'aws-solutions-architect-associate', 'AWS', 'associate');

-- CCP Domains (CLF-C02 exam guide)
insert into domains (id, certification_id, name, slug, weight_percent, sort_order) values
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Cloud Concepts', 'cloud-concepts', 24, 1),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Security and Compliance', 'security-compliance', 30, 2),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Cloud Technology and Services', 'cloud-technology-services', 34, 3),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'Billing, Pricing, and Support', 'billing-pricing-support', 12, 4);

-- CCP Subtopics
insert into subtopics (domain_id, name, slug) values
  -- Cloud Concepts
  ('22222222-0000-0000-0000-000000000001', 'Cloud value proposition', 'cloud-value-proposition'),
  ('22222222-0000-0000-0000-000000000001', 'Cloud economics', 'cloud-economics'),
  ('22222222-0000-0000-0000-000000000001', 'Cloud architecture design principles', 'cloud-architecture-principles'),
  ('22222222-0000-0000-0000-000000000001', 'AWS Well-Architected Framework', 'well-architected-framework'),
  -- Security and Compliance
  ('22222222-0000-0000-0000-000000000002', 'Shared responsibility model', 'shared-responsibility'),
  ('22222222-0000-0000-0000-000000000002', 'AWS security services', 'aws-security-services'),
  ('22222222-0000-0000-0000-000000000002', 'IAM and access management', 'iam'),
  ('22222222-0000-0000-0000-000000000002', 'Compliance and governance', 'compliance-governance'),
  -- Cloud Technology and Services
  ('22222222-0000-0000-0000-000000000003', 'Core compute services (EC2, Lambda)', 'compute'),
  ('22222222-0000-0000-0000-000000000003', 'Storage services (S3, EBS, EFS)', 'storage'),
  ('22222222-0000-0000-0000-000000000003', 'Networking (VPC, Route 53, CloudFront)', 'networking'),
  ('22222222-0000-0000-0000-000000000003', 'Database services (RDS, DynamoDB)', 'databases'),
  ('22222222-0000-0000-0000-000000000003', 'Monitoring and management (CloudWatch)', 'monitoring'),
  -- Billing
  ('22222222-0000-0000-0000-000000000004', 'AWS pricing models', 'pricing-models'),
  ('22222222-0000-0000-0000-000000000004', 'Billing tools (Cost Explorer, Budgets)', 'billing-tools'),
  ('22222222-0000-0000-0000-000000000004', 'Support plans', 'support-plans');

-- SAA Domains (SAA-C03 exam guide)
insert into domains (id, certification_id, name, slug, weight_percent, sort_order) values
  ('22222222-0000-0000-0001-000000000001', '11111111-0000-0000-0000-000000000002', 'Design Secure Architectures', 'design-secure-architectures', 30, 1),
  ('22222222-0000-0000-0001-000000000002', '11111111-0000-0000-0000-000000000002', 'Design Resilient Architectures', 'design-resilient-architectures', 26, 2),
  ('22222222-0000-0000-0001-000000000003', '11111111-0000-0000-0000-000000000002', 'Design High-Performing Architectures', 'design-high-performing-architectures', 24, 3),
  ('22222222-0000-0000-0001-000000000004', '11111111-0000-0000-0000-000000000002', 'Design Cost-Optimized Architectures', 'design-cost-optimized-architectures', 20, 4);

-- SAA Subtopics
insert into subtopics (domain_id, name, slug) values
  ('22222222-0000-0000-0001-000000000001', 'IAM policies and roles', 'iam-policies-roles'),
  ('22222222-0000-0000-0001-000000000001', 'VPC security (security groups, NACLs)', 'vpc-security'),
  ('22222222-0000-0000-0001-000000000001', 'Data encryption at rest and in transit', 'encryption'),
  ('22222222-0000-0000-0001-000000000001', 'AWS WAF, Shield, and GuardDuty', 'threat-protection'),
  ('22222222-0000-0000-0001-000000000002', 'Multi-AZ and multi-region design', 'multi-az-region'),
  ('22222222-0000-0000-0001-000000000002', 'Auto Scaling and load balancing', 'auto-scaling'),
  ('22222222-0000-0000-0001-000000000002', 'Disaster recovery strategies', 'disaster-recovery'),
  ('22222222-0000-0000-0001-000000000003', 'Compute performance (EC2 types, Lambda)', 'compute-performance'),
  ('22222222-0000-0000-0001-000000000003', 'Caching strategies (ElastiCache, CloudFront)', 'caching'),
  ('22222222-0000-0000-0001-000000000003', 'Storage performance (EBS, S3, EFS)', 'storage-performance'),
  ('22222222-0000-0000-0001-000000000004', 'Reserved and Spot instances', 'reserved-spot'),
  ('22222222-0000-0000-0001-000000000004', 'Cost-efficient storage (S3 tiers, lifecycle)', 'cost-storage'),
  ('22222222-0000-0000-0001-000000000004', 'Serverless cost patterns', 'serverless-cost');
