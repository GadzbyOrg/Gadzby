"use client";

import { EndMandatDialog } from "./end-mandat-dialog";
import { StartMandatDialog } from "./start-mandat-dialog";

interface MandatActionsProps {
    hasActiveMandat: boolean;
}

export function MandatActions({ hasActiveMandat }: MandatActionsProps) {
    return (
        <div className="flex items-center gap-4">
            {hasActiveMandat ? (
                <EndMandatDialog />
            ) : (
                <StartMandatDialog />
            )}
        </div>
    );
}
