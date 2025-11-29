import { Tabs, TabsList, Tab, TabsContent, TabPanel } from '../../components/Tabs';

export default {
  title: 'Components/Tabs',
  component: Tabs,
};

export const Basic = {
  render: () => (
    <div className="ig-p-4 ig-max-w-lg">
      <Tabs defaultValue="tab1">
        <TabsList>
          <Tab value="tab1">Account</Tab>
          <Tab value="tab2">Password</Tab>
          <Tab value="tab3">Settings</Tab>
        </TabsList>
        <TabsContent>
          <TabPanel value="tab1">
            <p>Manage your account settings and preferences.</p>
          </TabPanel>
          <TabPanel value="tab2">
            <p>Change your password and security options.</p>
          </TabPanel>
          <TabPanel value="tab3">
            <p>Configure application settings.</p>
          </TabPanel>
        </TabsContent>
      </Tabs>
    </div>
  ),
};

export const Pills = {
  render: () => (
    <div className="ig-p-4 ig-max-w-lg">
      <Tabs defaultValue="overview" variant="pills">
        <TabsList>
          <Tab value="overview">Overview</Tab>
          <Tab value="analytics">Analytics</Tab>
          <Tab value="reports">Reports</Tab>
          <Tab value="notifications">Notifications</Tab>
        </TabsList>
        <TabsContent>
          <TabPanel value="overview">
            <p>Dashboard overview with key metrics.</p>
          </TabPanel>
          <TabPanel value="analytics">
            <p>Detailed analytics and charts.</p>
          </TabPanel>
          <TabPanel value="reports">
            <p>Generate and download reports.</p>
          </TabPanel>
          <TabPanel value="notifications">
            <p>Manage notification preferences.</p>
          </TabPanel>
        </TabsContent>
      </Tabs>
    </div>
  ),
};

export const Vertical = {
  render: () => (
    <div className="ig-p-4" style={{ maxWidth: '600px' }}>
      <Tabs defaultValue="general" vertical>
        <TabsList>
          <Tab value="general">General</Tab>
          <Tab value="security">Security</Tab>
          <Tab value="privacy">Privacy</Tab>
          <Tab value="billing">Billing</Tab>
        </TabsList>
        <TabsContent>
          <TabPanel value="general">
            <h4 className="ig-fw-semibold ig-mb-2">General Settings</h4>
            <p>Configure your general account preferences.</p>
          </TabPanel>
          <TabPanel value="security">
            <h4 className="ig-fw-semibold ig-mb-2">Security Settings</h4>
            <p>Manage two-factor authentication and sessions.</p>
          </TabPanel>
          <TabPanel value="privacy">
            <h4 className="ig-fw-semibold ig-mb-2">Privacy Settings</h4>
            <p>Control your data and visibility options.</p>
          </TabPanel>
          <TabPanel value="billing">
            <h4 className="ig-fw-semibold ig-mb-2">Billing</h4>
            <p>Manage your subscription and payment methods.</p>
          </TabPanel>
        </TabsContent>
      </Tabs>
    </div>
  ),
};

export const WithDisabled = {
  render: () => (
    <div className="ig-p-4 ig-max-w-lg">
      <Tabs defaultValue="active">
        <TabsList>
          <Tab value="active">Active</Tab>
          <Tab value="pending">Pending</Tab>
          <Tab value="disabled" disabled>Disabled</Tab>
        </TabsList>
        <TabsContent>
          <TabPanel value="active">Active tab content</TabPanel>
          <TabPanel value="pending">Pending tab content</TabPanel>
        </TabsContent>
      </Tabs>
    </div>
  ),
};
