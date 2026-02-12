
import { getEmailDomain } from './lib/utils/domain-verification'

console.log('jane@valid-company-domain.com:', getEmailDomain('jane@valid-company-domain.com'))
console.log('jane@company.com:', getEmailDomain('jane@company.com'))
console.log('jane@example.co.uk:', getEmailDomain('jane@example.co.uk'))
