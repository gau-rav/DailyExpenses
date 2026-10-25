import { Link } from 'react-router-dom'
import SiteFooter from '../components/SiteFooter'

const LAST_UPDATED = 'October 25, 2026'
const CONTACT_EMAIL = 'support@paisawise.app'

function LegalHeader() {
  return <header className="legal-header">
    <Link to="/" className="legal-brand">
      <img className="brand-mark" src="/logo.jpg" alt="" />
      <span>PaisaWise</span>
    </Link>
    <Link to="/" className="legal-back">Back to PaisaWise</Link>
  </header>
}

function PrivacyPolicy() {
  return <article className="legal-article">
    <p className="legal-eyebrow">Legal</p>
    <h1>Privacy Policy</h1>
    <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

    <p>PaisaWise is a personal finance tracker that helps you record expenses, manage bills and budgets, and understand where your money goes. This policy explains what information we collect, how we use it, and the choices you have.</p>

    <h2>Information we collect</h2>
    <ul className="legal-list">
      <li><strong>Account details.</strong> Your name, email address, and a securely hashed password. If you sign in with Google, we receive your name, email address, and Google account identifier.</li>
      <li><strong>Financial data you enter.</strong> Expenses, amounts, categories, dates, payment methods, bills, budgets, notes, and any other information you add to the app.</li>
      <li><strong>Gmail data, only if you connect it.</strong> With your permission, we read messages that match transaction-related search terms so we can suggest expenses. We extract the merchant, amount, date, and reference number. We do not store the full email body or attachments, and we do not read unrelated messages.</li>
      <li><strong>Technical information.</strong> Session cookies, browser and device information, and limited server logs used to keep the service secure and reliable.</li>
    </ul>

    <h2>How we use your information</h2>
    <ul className="legal-list">
      <li>Provide, maintain, and secure the PaisaWise service.</li>
      <li>Show your expenses, bills, budgets, reports, and calendar.</li>
      <li>Import transaction suggestions when you connect Gmail.</li>
      <li>Respond to support requests and send essential service messages.</li>
      <li>Detect abuse, troubleshoot problems, and improve the product.</li>
      <li>Comply with legal obligations.</li>
    </ul>
    <p>We do not sell your personal information, and we do not use your financial or Gmail data for advertising.</p>

    <h2>Gmail and Google user data</h2>
    <p>PaisaWise requests the <code>gmail.readonly</code> scope. This allows us to read messages, but not to send, modify, or delete them. We only process messages that match our transaction search terms, and we only keep the transaction fields needed to create an expense suggestion. We do not use Gmail data for advertising, and we do not allow humans to read it except when you ask us to, when necessary for security or abuse investigation, or when required by law.</p>
    <p>Our use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. You can disconnect Gmail at any time from Settings. Disconnecting revokes our access and stops future imports.</p>

    <h2>How we share information</h2>
    <p>We share information only with service providers that help us run PaisaWise, such as hosting and database providers, and only as needed to provide the service. We may also disclose information if required by law, to protect our rights or users, or as part of a merger or acquisition. We do not sell personal information.</p>

    <h2>Data retention</h2>
    <p>We keep your account and expense data until you delete it or close your account. Gmail access tokens are kept until you disconnect Gmail. Raw email bodies and attachments are not stored. Server logs are retained for a limited period for security and troubleshooting.</p>

    <h2>Security</h2>
    <p>We use encryption in transit, encrypted storage for OAuth tokens, hashed passwords, and access controls. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.</p>

    <h2>Your choices and rights</h2>
    <ul className="legal-list">
      <li>Access, correct, export, or delete your data from the app or by contacting us.</li>
      <li>Disconnect Gmail at any time from Settings.</li>
      <li>Close your account and request deletion of your data.</li>
      <li>Withdraw consent where processing is based on consent.</li>
    </ul>
    <p>Depending on where you live, you may have additional rights under local privacy laws. We will respond to verified requests within the time required by applicable law.</p>

    <h2>Cookies and local storage</h2>
    <p>We use an essential session cookie to keep you signed in. We also use your browser's local storage to remember preferences such as your theme and currency. We do not use advertising cookies.</p>

    <h2>Children</h2>
    <p>PaisaWise is not intended for children under 13, and we do not knowingly collect personal information from children. If you believe a child has provided us with personal information, contact us so we can delete it.</p>

    <h2>International transfers</h2>
    <p>Your information may be processed in countries other than your own. Where required, we use appropriate safeguards for international transfers.</p>

    <h2>Changes to this policy</h2>
    <p>We may update this policy from time to time. If we make material changes, we will post the updated policy and change the date above. Continued use of PaisaWise after an update means you accept the revised policy.</p>

    <h2>Contact</h2>
    <p>Questions about this policy or your data? Email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
  </article>
}

function TermsAndConditions() {
  return <article className="legal-article">
    <p className="legal-eyebrow">Legal</p>
    <h1>Terms &amp; Conditions</h1>
    <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

    <p>These terms govern your use of PaisaWise. By creating an account or using the service, you agree to these terms. If you do not agree, do not use PaisaWise.</p>

    <h2>Who can use PaisaWise</h2>
    <p>You must be at least 13 years old and able to enter into a binding agreement. If you use PaisaWise on behalf of an organization, you confirm that you have authority to accept these terms for that organization.</p>

    <h2>Your account</h2>
    <p>You are responsible for keeping your login credentials secure and for activity under your account. Provide accurate information and tell us promptly if you suspect unauthorized access. We may suspend or close accounts that violate these terms or create risk for other users.</p>

    <h2>The service</h2>
    <p>PaisaWise helps you record and review personal finances. Features may include expense tracking, bills, budgets, reports, calendar views, and optional email imports. We may add, change, or remove features over time.</p>

    <h2>Gmail connection</h2>
    <p>Connecting Gmail is optional. If you connect it, you authorize PaisaWise to read transaction-related messages using the <code>gmail.readonly</code> scope. You are responsible for having the right to access the mailbox you connect. You can disconnect Gmail at any time from Settings. Your use of Google services is also governed by your agreement with Google.</p>

    <h2>Acceptable use</h2>
    <p>You agree not to:</p>
    <ul className="legal-list">
      <li>Use PaisaWise for unlawful, fraudulent, or harmful purposes.</li>
      <li>Access accounts or data that do not belong to you.</li>
      <li>Interfere with the service, bypass security controls, or attempt to disrupt other users.</li>
      <li>Reverse engineer, scrape, or resell the service except as permitted by law.</li>
      <li>Upload malware or use the service to send spam or abusive content.</li>
    </ul>

    <h2>Your data</h2>
    <p>You own the information you add to PaisaWise. You grant us a limited license to store, process, and display that information so we can provide the service. You are responsible for the accuracy of your data and for keeping your own backups where needed.</p>

    <h2>Not financial advice</h2>
    <p>PaisaWise is an organizational tool, not a bank, financial adviser, or accounting service. Amounts, suggestions, and reports may be incomplete or inaccurate. Always verify important information with your bank or financial institution before making financial decisions.</p>

    <h2>Third-party services</h2>
    <p>PaisaWise relies on third-party providers such as Google and our hosting and database providers. We are not responsible for third-party services, and their terms and policies apply to your use of them.</p>

    <h2>Availability and changes</h2>
    <p>We aim to keep PaisaWise available, but we do not guarantee uninterrupted or error-free operation. Maintenance, outages, and factors outside our control may affect the service. We may modify or discontinue features with reasonable notice where practical.</p>

    <h2>Termination</h2>
    <p>You may stop using PaisaWise at any time. We may suspend or terminate access if you violate these terms, if required by law, or if continuing the service would create risk. On termination, your right to use the service ends, but provisions that by their nature should survive will continue to apply.</p>

    <h2>Disclaimers</h2>
    <p>PaisaWise is provided "as is" and "as available" without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the service will be accurate, secure, or uninterrupted.</p>

    <h2>Limitation of liability</h2>
    <p>To the maximum extent permitted by law, PaisaWise and its team will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, data, or goodwill. Our total liability for any claim relating to the service will not exceed the greater of the amount you paid us in the twelve months before the claim or INR 1,000.</p>

    <h2>Indemnity</h2>
    <p>You agree to indemnify and hold PaisaWise harmless from claims, losses, and expenses arising from your use of the service, your data, or your violation of these terms or applicable law.</p>

    <h2>Governing law</h2>
    <p>These terms are governed by the laws of India. Courts in India will have exclusive jurisdiction over disputes, unless applicable law requires otherwise.</p>

    <h2>Changes to these terms</h2>
    <p>We may update these terms from time to time. If we make material changes, we will post the updated terms and change the date above. Continued use of PaisaWise after an update means you accept the revised terms.</p>

    <h2>Contact</h2>
    <p>Questions about these terms? Email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
  </article>
}

export default function LegalPage({ kind }) {
  return <div className="legal-screen">
    <LegalHeader />
    <main className="legal-main">
      {kind === 'terms' ? <TermsAndConditions /> : <PrivacyPolicy />}
    </main>
    <SiteFooter className="site-footer-legal" />
  </div>
}
