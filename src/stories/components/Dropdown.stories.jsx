import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownDivider, DropdownHeader } from '../../components/Dropdown';
import { Button } from '../../components/Button';

export default {
  title: 'Components/Dropdown',
  component: Dropdown,
};

export const Basic = {
  render: () => (
    <div className="ig-p-4">
      <Dropdown>
        {({ open, setOpen }) => (
          <>
            <DropdownTrigger onClick={() => setOpen(!open)}>
              <Button variant="outline">
                Options &#9662;
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem>Edit</DropdownItem>
              <DropdownItem>Duplicate</DropdownItem>
              <DropdownItem>Share</DropdownItem>
              <DropdownDivider />
              <DropdownItem danger>Delete</DropdownItem>
            </DropdownMenu>
          </>
        )}
      </Dropdown>
    </div>
  ),
};

export const WithHeaders = {
  render: () => (
    <div className="ig-p-4">
      <Dropdown>
        {({ open, setOpen }) => (
          <>
            <DropdownTrigger onClick={() => setOpen(!open)}>
              <Button variant="primary">
                My Account &#9662;
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownHeader>Signed in as</DropdownHeader>
              <DropdownItem>john@example.com</DropdownItem>
              <DropdownDivider />
              <DropdownHeader>Account</DropdownHeader>
              <DropdownItem>Profile</DropdownItem>
              <DropdownItem>Settings</DropdownItem>
              <DropdownItem>Billing</DropdownItem>
              <DropdownDivider />
              <DropdownItem danger>Sign out</DropdownItem>
            </DropdownMenu>
          </>
        )}
      </Dropdown>
    </div>
  ),
};

export const WithActiveItem = {
  render: () => (
    <div className="ig-p-4">
      <Dropdown>
        {({ open, setOpen }) => (
          <>
            <DropdownTrigger onClick={() => setOpen(!open)}>
              <Button variant="outline">
                Sort by &#9662;
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem active>Newest first</DropdownItem>
              <DropdownItem>Oldest first</DropdownItem>
              <DropdownItem>Most popular</DropdownItem>
              <DropdownItem>Alphabetical</DropdownItem>
            </DropdownMenu>
          </>
        )}
      </Dropdown>
    </div>
  ),
};

export const AlignRight = {
  render: () => (
    <div className="ig-p-4 ig-flex ig-justify-end">
      <Dropdown align="right">
        {({ open, setOpen }) => (
          <>
            <DropdownTrigger onClick={() => setOpen(!open)}>
              <Button icon variant="ghost">&#8942;</Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem>View</DropdownItem>
              <DropdownItem>Edit</DropdownItem>
              <DropdownDivider />
              <DropdownItem danger>Delete</DropdownItem>
            </DropdownMenu>
          </>
        )}
      </Dropdown>
    </div>
  ),
};

export const DropUp = {
  render: () => (
    <div className="ig-p-4" style={{ marginTop: '200px' }}>
      <Dropdown direction="up">
        {({ open, setOpen }) => (
          <>
            <DropdownTrigger onClick={() => setOpen(!open)}>
              <Button variant="outline">
                &#9652; Menu opens up
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem>Option 1</DropdownItem>
              <DropdownItem>Option 2</DropdownItem>
              <DropdownItem>Option 3</DropdownItem>
            </DropdownMenu>
          </>
        )}
      </Dropdown>
    </div>
  ),
};
