"use client";

import { APP_NAME } from "@/lib/constants";
import { useEffect, useState } from "react";

const Footer = () => {
    const [mounted, setMounted] = useState(false);
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <footer className="border-t">
            <div className="p-5 flex-center">
                {currentYear} © {APP_NAME}. All Rights Reserved
            </div>
        </footer>
    );
}
 
export default Footer;