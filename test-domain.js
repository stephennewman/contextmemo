function getEmailDomain(email) {
  const parts = email.split('@');
  return parts[1] || '';
}

console.log('getEmailDomain("jane@company.com") =', getEmailDomain("jane@company.com"));
console.log('typeof getEmailDomain("jane@company.com") =', typeof getEmailDomain("jane@company.com"));
console.log('getEmailDomain("jane@company.com").toLowerCase() =', getEmailDomain("jane@company.com").toLowerCase());
