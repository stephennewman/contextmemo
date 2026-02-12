
import { getEmailDomain } from '@/lib/utils/domain-verification'

// Test with various email addresses
console.log('Test 1:', 'jane@company.com', '→', getEmailDomain('jane@company.com'))
console.log('Test 2:', 'jane@acme-corporation.com', '→', getEmailDomain('jane@acme-corporation.com'))
console.log('Test 3:', 'test@example.co.uk', '→', getEmailDomain('test@example.co.uk'))
console.log('Test 4:', 'user.name+tag@domain.org', '→', getEmailDomain('user.name+tag@domain.org'))
