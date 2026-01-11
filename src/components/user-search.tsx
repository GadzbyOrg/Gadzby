
import { useState, useEffect, useRef } from 'react';
import { IconSearch, IconUser, IconLoader2 } from '@tabler/icons-react';
import { searchUsersPublicAction } from '@/features/users/actions';
import { UserAvatar } from "@/components/user-avatar";

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

export function UserSearch({ 
    onSelect, 
    placeholder = "Ajouter un participant...", 
    excludeIds = [],
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
    const preventSearchRef = useRef(false);

    // Simple debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (preventSearchRef.current) {
                preventSearchRef.current = false;
                return;
            }

            if (query.length < 2) {
                setResults([]);
                return;
            }
            
            setIsLoading(true);
            try {
                // If the action expects an object (like authenticatedAction wrappers usually do if they have input), handle it.
                // searchUsersPublicAction takes a string `query`.
                // Our new action takes { query: string }.
                // We need to normalize or expect the caller to wrap it if needed.
                // However, `searchUsersPublicAction` is a direct function taking string.
                // `searchUsersForPaymentAction` is an `authenticatedAction` which implicitly takes the first argument as data.
                // authenticatedAction(schema, handler) returns a function that takes (data).
                
                // Let's assume searchAction signature matches the one we want to use.
                // But wait, `searchUsersPublicAction` is `(query: string) => Promise`.
                // `authenticatedAction` z.object({ query: z.string() }) returns `(data: { query: string }) => Promise`.
                // They have different signatures.
                
                // I should standardize valid usage.
                
                let res;
                 // Hacky check or just try/catch?
                 // Best is to assume the passed searchAction adapts to the signature needed or we adapt here.
                 // But better: let's make the prop expects `(query: string) => ...`
                 
                 res = await searchAction(query);
                 
                if (res?.users) {
                    const filtered = res.users.filter((u: any) => !excludeIds.includes(u.id));
                    setResults(filtered);
                    setIsOpen(true);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, excludeIds]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
             if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (user: any) => {
        onSelect(user);
        if (clearOnSelect) {
            setQuery('');
        } else {
            preventSearchRef.current = true;
            setQuery(user.username);
        }
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className={cn("relative w-full max-w-sm", className)}>
            <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                    type="text"
                    name={name}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!isOpen && e.target.value.length >= 2) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className={cn(
                        "w-full bg-dark-900 border border-dark-700 rounded-md py-2 pl-9 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-500 transition-colors",
                        inputClassName
                    )}
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <IconLoader2 className="animate-spin text-gray-500" size={16} />
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-dark-800 border border-dark-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {results.map((user) => (
                        <button
                            type="button"
                            key={user.id}
                            onClick={() => handleSelect(user)}
                            className="w-full text-left px-4 py-2 hover:bg-dark-700 transition-colors flex items-center gap-3 group"
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
                                <div className="text-sm font-medium text-gray-200">
                                    {user.prenom} {user.nom}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {user.bucque ? `${user.bucque} ` : ''}
                                    <span className="opacity-70">({user.username})</span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            
             {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
                <div className="absolute z-50 w-full mt-1 bg-dark-800 border border-dark-700 rounded-md shadow-lg p-4 text-center text-sm text-gray-500">
                    Aucun utilisateur trouvé
                </div>
            )}
        </div>
    );
}
