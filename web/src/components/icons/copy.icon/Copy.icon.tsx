import { ISVGProps } from "@/components/ui/icons/clock/RotatingClock";
import { IInitialState } from "@/reduxToolkit/Interfaces";
import { FC } from "react";
import { useSelector } from "react-redux";

const CopyIcon: FC<ISVGProps> = (props) => {
  const theme = useSelector((state: IInitialState) => state.theme);
  return (
    <svg
      {...props}
      width={props.width || 25}
      height={props.width || 25}
      viewBox="0 0 24 24"
    >
      <path
        d="M6 11C6 8.17157 6 6.75736 6.87868 5.87868C7.75736 5 9.17157 5 12 5H15C17.8284 5 19.2426 5 20.1213 5.87868C21 6.75736 21 8.17157 21 11V16C21 18.8284 21 20.2426 20.1213 21.1213C19.2426 22 17.8284 22 15 22H12C9.17157 22 7.75736 22 6.87868 21.1213C6 20.2426 6 18.8284 6 16V11Z"
        stroke={theme === "dark" ? "#dcdcdc" : "#333"}
        strokeWidth="1.5"
        fill="none"
      />
      <path
        opacity="0.5"
        d="M6 19C4.34315 19 3 17.6569 3 16V10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H15C16.6569 2 18 3.34315 18 5"
        stroke={theme === "dark" ? "#dcdcdc" : "#333"}
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
};

export default CopyIcon;
