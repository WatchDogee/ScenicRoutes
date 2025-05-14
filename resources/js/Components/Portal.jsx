import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
export default function Portal({ children, rootId = 'portal-root' }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        
        let portalRoot = document.getElementById(rootId);
        if (!portalRoot) {
            portalRoot = document.createElement('div');
            portalRoot.id = rootId;
            document.body.appendChild(portalRoot);
        }
        setMounted(true);
        
        return () => {
            if (portalRoot && portalRoot.childNodes.length === 0) {
                document.body.removeChild(portalRoot);
            }
        };
    }, [rootId]);
    return mounted ? createPortal(children, document.getElementById(rootId)) : null;
}
