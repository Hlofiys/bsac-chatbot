import { FC, SVGProps } from "react";

export type ISVGProps = SVGProps<SVGSVGElement>;
const RotatingClock: FC<ISVGProps> = (props) => {
  const { fill, ...otherProps } = props;
  return (
    <svg
      {...otherProps}
      version="1.1"
      viewBox="0 0 237.54 237.54"
      width={15}
      height={15}
    >
      <circle
        cx="118.77"
        cy="118.77"
        r="100"
        stroke={fill || 'black'}
        strokeWidth="12"
        fill="none"
      />

      {/* Часовая стрелка с анимацией */}
      <g>
        <animateTransform
          attributeType="XML"
          attributeName="transform"
          type="rotate"
          from="0 118.77 118.77"
          to="360 118.77 118.77"
          dur="1.75s"
          repeatCount="indefinite"
        />
        <path
          d="M118.77,90 L118.77,118.77"
          stroke={fill || 'black'}
          strokeWidth="12"
          strokeLinecap="round"
        />
      </g>

      {/* Минутная стрелка с анимацией */}
      <g>
        <animateTransform
          attributeType="XML"
          attributeName="transform"
          type="rotate"
          from="0 118.77 118.77"
          to="360 118.77 118.77"
          dur="1.25s"
          repeatCount="indefinite"
        />
        <path
          d="M118.77,80 L118.77,118.77"
          stroke={fill || 'black'}
          strokeWidth="10"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export default RotatingClock;
