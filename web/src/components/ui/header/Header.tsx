import { FC } from "react";
import styles from "./Header.module.scss";
import Image from "next/image";
import ThemeSwitch from "../switch/Switch";

const Header: FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Image
          src={"/images/botImg.png"}
          width={58}
          height={58}
          className={styles.image}
          alt="БГАС логотип"
          priority={true}
        />
      </div>

      <section>
        <h1>БГАС ассистент</h1>
        <p>active</p>
      </section>

      <ThemeSwitch />
      {/* <SunOutlined style={{color: '#a0a0a0', fontSize: 35}} /> */}
      {/* <MoonOutlined style={{color: '#a0a0a0', fontSize: 35}}/> */}
    </header>
  );
};

export default Header;
