import { Accordion, AccordionItem, AccordionHeader, AccordionContent } from '../../components/Accordion';

export default {
  title: 'Components/Accordion',
  component: Accordion,
};

export const Single = {
  render: () => (
    <div className="ig-p-4 ig-max-w-lg">
      <Accordion type="single" defaultValue="item1">
        <AccordionItem value="item1">
          <AccordionHeader value="item1">What is Igoded Design System?</AccordionHeader>
          <AccordionContent>
            Igoded is a comprehensive CSS design system with beautiful dark and light themes,
            featuring a unique color palette and modern components.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2">
          <AccordionHeader value="item2">How do I install it?</AccordionHeader>
          <AccordionContent>
            Simply include the CSS file in your project and start using the classes.
            No JavaScript required for basic styling.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item3">
          <AccordionHeader value="item3">Is it customizable?</AccordionHeader>
          <AccordionContent>
            Yes! All colors, spacing, and other design tokens are defined as CSS variables.
            You can easily override them to match your brand.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
};

export const Multiple = {
  render: () => (
    <div className="ig-p-4 ig-max-w-lg">
      <Accordion type="multiple" defaultValue={['item1', 'item3']}>
        <AccordionItem value="item1">
          <AccordionHeader value="item1">Section 1</AccordionHeader>
          <AccordionContent>
            Content for section 1. Multiple items can be open at the same time.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item2">
          <AccordionHeader value="item2">Section 2</AccordionHeader>
          <AccordionContent>
            Content for section 2. Click to expand or collapse.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item3">
          <AccordionHeader value="item3">Section 3</AccordionHeader>
          <AccordionContent>
            Content for section 3. This section is also open by default.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
};

export const FAQ = {
  render: () => (
    <div className="ig-p-4 ig-max-w-lg">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Frequently Asked Questions</h2>
      <Accordion type="single">
        <AccordionItem value="q1">
          <AccordionHeader value="q1">How do I reset my password?</AccordionHeader>
          <AccordionContent>
            Click on the Forgot Password link on the login page and follow the instructions
            sent to your email address.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="q2">
          <AccordionHeader value="q2">Can I cancel my subscription?</AccordionHeader>
          <AccordionContent>
            Yes, you can cancel your subscription at any time from your account settings.
            Your access will continue until the end of your billing period.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="q3">
          <AccordionHeader value="q3">Do you offer refunds?</AccordionHeader>
          <AccordionContent>
            We offer a 30-day money-back guarantee for all new subscriptions.
            Contact our support team for assistance.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="q4">
          <AccordionHeader value="q4">How do I contact support?</AccordionHeader>
          <AccordionContent>
            You can reach our support team via email at support@example.com or through
            the live chat feature available in the bottom right corner.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
};
