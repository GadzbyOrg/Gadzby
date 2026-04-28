import { IconLoader2, IconSearch } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

import { UserAvatar } from "@/components/user-avatar";
import { searchUsersPublicAction } from '@/features/users/actions';
import { cn } from "@/lib/utils";

export interface UserSearchProps {
    onSelect: (user: any) => void;
    placeholder?: string;
    excludeIds?: string[];
    className?: string;
    inputClassName?: string;
    name?: string;
    clearOnSelect?: boolean;
    searchAction?: (query: string) => Promise<{ users?: any[]; error?: string }>;
}

const EMPTY_ARRAY: string[] = [];

export function UserSearch({
    onSelect,
    placeholder = "Ajouter un participant...",
    excludeIds = EMPTY_ARRAY,
    className,
    inputClassName,
    name,
    clearOnSelect = true,
    searchAction = searchUsersPublicAction
}: UserSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const skipNextSearch = useRef(false);

    useEffect(() => {
        let active = true;

        if (query.length < 1) {
            setResults([]);
            setIsLoading(false);
            setIsOpen(false);
            return;
        }

        if (skipNextSearch.current) {
            skipNextSearch.current = false;
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await searchAction(query);
                if (active && res?.users) {
                    const filtered = res.users
                        .filter((u: any) => !excludeIds.includes(u.id))
                        .sort((a, b) => {
                            const queryLower = query.toLowerCase().trim();

                            const aUser = (a.username || "").toLowerCase();
                            const bUser = (b.username || "").toLowerCase();

                            // 1. Exact match
                            const aExact = aUser === queryLower;
                            const bExact = bUser === queryLower;
                            if (aExact && !bExact) return -1;
                            if (!aExact && bExact) return 1;

                            const aStarts = aUser.startsWith(queryLower);
                            const bStarts = bUser.startsWith(queryLower);
                            if (aStarts && !bStarts) return -1;
                            if (!aStarts && bStarts) return 1;
                            if (aStarts && bStarts && aUser.length !== bUser.length) {
                                return aUser.length - bUser.length;
                            }

                            // 3. Includes
                            const aIncludes = aUser.includes(queryLower);
                            const bIncludes = bUser.includes(queryLower);
                            if (aIncludes && !bIncludes) return -1;
                            if (!aIncludes && bIncludes) return 1;
                            if (aIncludes && bIncludes && aUser.length !== bUser.length) {
                                return aUser.length - bUser.length;
                            }

                            // 4. Fallback promotion + alphabétique
                            const aMatch = a.promss ? a.promss.match(/\d+/) : null;
                            const bMatch = b.promss ? b.promss.match(/\d+/) : null;
                            const aPromss = aMatch ? parseInt(aMatch[0], 10) : 0;
                            const bPromss = bMatch ? parseInt(bMatch[0], 10) : 0;

                            if (aPromss !== bPromss) {
                                return bPromss - aPromss;
                            }

                            return aUser.localeCompare(bUser);
                        });

                    setResults(filtered);
                    setIsOpen(true);
                }
            } catch (e) {
                console.error(e);
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        }, 300);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [query, excludeIds, searchAction]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (user: any) => {
        onSelect(user);
        if (clearOnSelect) {
            setQuery('');
        } else {
            skipNextSearch.current = true;
            setQuery(user.username);
        }
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className={cn("relative w-full max-w-sm", className)}>
            <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" size={16} />
                <input
                    type="text"
                    name={name}
                    value={query}
                    onChange={(e) => {
                        const val = e.target.value;
                        setQuery(val);
                        if (val.length >= 1) {
                            setIsLoading(true);
                        } else {
                            setIsLoading(false);
                        }
                        if (!isOpen && val.length >= 1) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className={cn(
                        "w-full bg-surface-900 border border-border rounded-md py-2 pl-9 pr-4 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent-500 transition-colors",
                        inputClassName
                    )}
                    suppressHydrationWarning
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <IconLoader2 className="animate-spin text-fg-subtle" size={16} />
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-elevated border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {results.map((user) => (
                        <button
                            type="button"
                            key={user.id}
                            onClick={() => handleSelect(user)}
                            className="w-full text-left px-4 py-2 hover:bg-elevated transition-colors flex items-center gap-3 group"
                        >
                            <UserAvatar
                                user={{
                                    id: user.id,
                                    name: user.username,
                                    username: user.username,
                                    image: user.image,
                                }}
                                className="h-8 w-8"
                            />
                            <div>
                                <div className="text-sm font-medium text-fg">
                                    {user.prenom} {user.nom}
                                </div>
                                <div className="text-xs text-fg-subtle">
                                    {user.bucque ? `${user.bucque} ` : ''}
                                    <span className="opacity-70">({user.username})</span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {isOpen && query.length >= 1 && results.length === 0 && !isLoading && (
                <div className="absolute z-50 w-full mt-1 bg-elevated border border-border rounded-md shadow-lg p-4 text-center text-sm text-fg-subtle">
                    Aucun utilisateur trouvé
                </div>
            )}
        </div>
    );
}