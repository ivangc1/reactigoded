import { Timeline, TimelineItem } from '../../components/Timeline';

export default {
  title: 'Components/Timeline',
  component: Timeline,
};

export const Basic = {
  render: () => (
    <div className="ig-p-4 ig-max-w-lg">
      <Timeline>
        <TimelineItem
          date="November 2024"
          title="Project Started"
          description="Initial project setup and configuration completed."
        />
        <TimelineItem
          date="October 2024"
          title="Design Phase"
          description="Created wireframes and design mockups."
        />
        <TimelineItem
          date="September 2024"
          title="Planning"
          description="Requirements gathering and project planning."
        />
      </Timeline>
    </div>
  ),
};

export const WithVariants = {
  render: () => (
    <div className="ig-p-4 ig-max-w-lg">
      <Timeline>
        <TimelineItem
          date="Today"
          title="Task Completed"
          description="All tests passing, ready for deployment."
          dotVariant="success"
        />
        <TimelineItem
          date="Yesterday"
          title="In Progress"
          description="Working on final adjustments."
          dotVariant="warning"
        />
        <TimelineItem
          date="3 days ago"
          title="Bug Found"
          description="Critical bug identified in production."
          dotVariant="danger"
        />
        <TimelineItem
          date="1 week ago"
          title="Feature Released"
          description="New dashboard feature released to all users."
        />
      </Timeline>
    </div>
  ),
};

export const ActivityLog = {
  render: () => (
    <div className="ig-p-4 ig-max-w-lg">
      <h3 className="ig-text-lg ig-fw-semibold ig-mb-4">Activity Log</h3>
      <Timeline>
        <TimelineItem
          date="2 minutes ago"
          title="John Doe updated the project"
          description="Changed status from 'In Progress' to 'Review'"
        />
        <TimelineItem
          date="1 hour ago"
          title="Jane Smith commented"
          description="'Looks good! Just a few minor suggestions.'"
        />
        <TimelineItem
          date="3 hours ago"
          title="File uploaded"
          description="design-v2.fig was uploaded to the project."
        />
        <TimelineItem
          date="Yesterday"
          title="Project created"
          description="John Doe created this project."
          dotVariant="success"
        />
      </Timeline>
    </div>
  ),
};

export const VersionHistory = {
  render: () => (
    <div className="ig-p-4 ig-max-w-lg">
      <h3 className="ig-text-lg ig-fw-semibold ig-mb-4">Version History</h3>
      <Timeline>
        <TimelineItem
          date="v2.1.0"
          title="Feature Release"
          description="Added dark mode support and new components."
          dotVariant="success"
        />
        <TimelineItem
          date="v2.0.1"
          title="Bug Fix"
          description="Fixed critical security vulnerability."
          dotVariant="danger"
        />
        <TimelineItem
          date="v2.0.0"
          title="Major Release"
          description="Complete redesign with new design system."
          dotVariant="success"
        />
        <TimelineItem
          date="v1.5.0"
          title="Minor Release"
          description="Performance improvements and bug fixes."
        />
      </Timeline>
    </div>
  ),
};

export const CustomContent = {
  render: () => (
    <div className="ig-p-4 ig-max-w-lg">
      <Timeline>
        <TimelineItem date="Step 1" title="Create Account">
          <p className="ig-text-sm ig-text-muted ig-mt-2">
            Sign up for a free account to get started.
          </p>
          <button className="ig-btn ig-btn-primary ig-btn-sm ig-mt-3">Sign Up</button>
        </TimelineItem>
        <TimelineItem date="Step 2" title="Configure Settings">
          <p className="ig-text-sm ig-text-muted ig-mt-2">
            Customize your workspace and preferences.
          </p>
        </TimelineItem>
        <TimelineItem date="Step 3" title="Invite Team">
          <p className="ig-text-sm ig-text-muted ig-mt-2">
            Add team members and assign roles.
          </p>
        </TimelineItem>
      </Timeline>
    </div>
  ),
};
