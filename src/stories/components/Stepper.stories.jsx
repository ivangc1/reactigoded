import { Stepper, Step, StepLine, StepItem, StepLabel } from '../../components/Stepper';

export default {
  title: 'Components/Stepper',
  component: Stepper,
};

export const Basic = {
  render: () => (
    <div className="ig-p-4">
      <Stepper>
        <Step complete>&#10003;</Step>
        <StepLine complete />
        <Step complete>&#10003;</Step>
        <StepLine complete />
        <Step active>3</Step>
        <StepLine />
        <Step>4</Step>
        <StepLine />
        <Step>5</Step>
      </Stepper>
    </div>
  ),
};

export const AllStates = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-8 ig-p-4">
      <div>
        <p className="ig-text-sm ig-text-muted ig-mb-2">Step 1 Active</p>
        <Stepper>
          <Step active>1</Step>
          <StepLine />
          <Step>2</Step>
          <StepLine />
          <Step>3</Step>
        </Stepper>
      </div>
      <div>
        <p className="ig-text-sm ig-text-muted ig-mb-2">Step 2 Active</p>
        <Stepper>
          <Step complete>&#10003;</Step>
          <StepLine complete />
          <Step active>2</Step>
          <StepLine />
          <Step>3</Step>
        </Stepper>
      </div>
      <div>
        <p className="ig-text-sm ig-text-muted ig-mb-2">All Complete</p>
        <Stepper>
          <Step complete>&#10003;</Step>
          <StepLine complete />
          <Step complete>&#10003;</Step>
          <StepLine complete />
          <Step complete>&#10003;</Step>
        </Stepper>
      </div>
    </div>
  ),
};

export const WithLabels = {
  render: () => (
    <div className="ig-p-4">
      <Stepper labeled>
        <StepItem complete>
          <Step complete>&#10003;</Step>
          <StepLabel>Account</StepLabel>
        </StepItem>
        <StepItem complete>
          <Step complete>&#10003;</Step>
          <StepLabel>Profile</StepLabel>
        </StepItem>
        <StepItem active>
          <Step active>3</Step>
          <StepLabel>Payment</StepLabel>
        </StepItem>
        <StepItem>
          <Step>4</Step>
          <StepLabel>Confirm</StepLabel>
        </StepItem>
      </Stepper>
    </div>
  ),
};

export const CheckoutFlow = {
  render: () => (
    <div className="ig-p-4 ig-max-w-2xl">
      <Stepper labeled>
        <StepItem complete>
          <Step complete>&#10003;</Step>
          <StepLabel>Cart</StepLabel>
        </StepItem>
        <StepItem complete>
          <Step complete>&#10003;</Step>
          <StepLabel>Shipping</StepLabel>
        </StepItem>
        <StepItem active>
          <Step active>3</Step>
          <StepLabel>Payment</StepLabel>
        </StepItem>
        <StepItem>
          <Step>4</Step>
          <StepLabel>Review</StepLabel>
        </StepItem>
        <StepItem>
          <Step>5</Step>
          <StepLabel>Confirmation</StepLabel>
        </StepItem>
      </Stepper>
    </div>
  ),
};
