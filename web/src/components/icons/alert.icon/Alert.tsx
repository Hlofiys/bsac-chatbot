import { ISVGProps } from "@/components/ui/icons/clock/RotatingClock";
import { FC } from "react";

const Alert: FC<ISVGProps> = (props) => {
  return (
    <svg
      viewBox="0 0 24 24"
      width={props.width || 20}
      height={props.height || 20}
    >
      <path
        fill={props.fill || "red"}
        d="M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z"
      />
    </svg>
  );
};

export default Alert;
