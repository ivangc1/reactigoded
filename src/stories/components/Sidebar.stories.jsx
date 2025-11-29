import { useState } from 'react';
import { Sidebar, SidebarHeader, SidebarNav, SidebarItem, SidebarFooter, SidebarSection, SidebarDivider } from '../../components/Sidebar';
import { Button } from '../../components/Button';

export default {
  title: 'Components/Sidebar',
  component: Sidebar,
};

export const Basic = {
  render: () => (
    <div style={{ height: '500px', display: 'flex' }}>
      <Sidebar>
        <SidebarHeader>
          <span style={{ fontSize: '1.5rem' }}>&#9733;</span>
          <span className="ig-fw-semibold">App Name</span>
        </SidebarHeader>
        <SidebarNav>
          <SidebarItem icon="&#127968;" active>Dashboard</SidebarItem>
          <SidebarItem icon="&#128101;">Users</SidebarItem>
          <SidebarItem icon="&#128200;">Analytics</SidebarItem>
          <SidebarItem icon="&#128230;">Products</SidebarItem>
          <SidebarItem icon="&#9881;">Settings</SidebarItem>
        </SidebarNav>
        <SidebarFooter>
          <Button variant="ghost" block>&#9776; Toggle</Button>
        </SidebarFooter>
      </Sidebar>
    </div>
  ),
};

export const Collapsed = {
  render: function CollapsibleSidebar() {
    const [collapsed, setCollapsed] = useState(false);
    return (
      <div style={{ height: '500px', display: 'flex' }}>
        <Sidebar collapsed={collapsed}>
          <SidebarHeader>
            <span style={{ fontSize: '1.5rem' }}>&#9733;</span>
            {!collapsed && <span className="ig-fw-semibold">App Name</span>}
          </SidebarHeader>
          <SidebarNav>
            <SidebarItem icon="&#127968;" active>Dashboard</SidebarItem>
            <SidebarItem icon="&#128101;">Users</SidebarItem>
            <SidebarItem icon="&#128200;">Analytics</SidebarItem>
            <SidebarItem icon="&#128230;">Products</SidebarItem>
            <SidebarItem icon="&#9881;">Settings</SidebarItem>
          </SidebarNav>
          <SidebarFooter>
            <Button variant="ghost" block onClick={() => setCollapsed(c => !c)}>
              {collapsed ? '&#8594;' : '&#8592;'}
            </Button>
          </SidebarFooter>
        </Sidebar>
        <div className="ig-p-4">
          <Button onClick={() => setCollapsed(c => !c)}>
            {collapsed ? 'Expand' : 'Collapse'} Sidebar
          </Button>
        </div>
      </div>
    );
  },
};

export const WithSections = {
  render: () => (
    <div style={{ height: '600px', display: 'flex' }}>
      <Sidebar>
        <SidebarHeader>
          <span style={{ fontSize: '1.5rem' }}>&#9733;</span>
          <span className="ig-fw-semibold">Dashboard</span>
        </SidebarHeader>
        <SidebarNav>
          <SidebarSection>Main</SidebarSection>
          <SidebarItem icon="&#127968;" active>Home</SidebarItem>
          <SidebarItem icon="&#128200;">Analytics</SidebarItem>
          <SidebarItem icon="&#128202;">Reports</SidebarItem>

          <SidebarDivider />
          <SidebarSection>Management</SidebarSection>
          <SidebarItem icon="&#128101;">Users</SidebarItem>
          <SidebarItem icon="&#128230;">Products</SidebarItem>
          <SidebarItem icon="&#128179;">Orders</SidebarItem>

          <SidebarDivider />
          <SidebarSection>Settings</SidebarSection>
          <SidebarItem icon="&#9881;">General</SidebarItem>
          <SidebarItem icon="&#128274;">Security</SidebarItem>
        </SidebarNav>
        <SidebarFooter>
          <SidebarItem icon="&#128682;">Logout</SidebarItem>
        </SidebarFooter>
      </Sidebar>
    </div>
  ),
};
