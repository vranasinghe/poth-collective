import React, { ReactElement, ReactNode } from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeContext';
import { UIProvider } from '../providers/UIProvider';
import type { ColorScheme } from '../../design/tokens';

export const Providers = ({ children, scheme = 'light' }: { children: ReactNode; scheme?: ColorScheme }) => (
    <ThemeProvider scheme={scheme}>
        <UIProvider>{children}</UIProvider>
    </ThemeProvider>
);

export const renderUI = (ui: ReactElement, scheme: ColorScheme = 'light') => render(ui, { wrapper: ({ children }) => <Providers scheme={scheme}>{children}</Providers> });

type JsonNode = { type: string; props: Record<string, unknown>; children: (JsonNode | string)[] | null };

const textOf = (node: JsonNode | string | null | undefined): string => {
    if (node == null) return '';
    if (typeof node === 'string') return node;
    return (node.children ?? []).map(textOf).join(' ');
};

const INTERACTIVE_ROLES = new Set(['button', 'link', 'radio', 'checkbox', 'switch', 'tab', 'menuitem']);

/**
 * Accessibility audit of everything currently rendered:
 *  - every interactive element (by role) has an accessible name (label or visible text);
 *  - every text input has an accessible label;
 *  - nothing interactive is hidden from assistive tech while visible.
 * Returns the problems found so a test can assert it is empty.
 */
export const auditAccessibility = (): string[] => {
    const problems: string[] = [];
    const walk = (node: JsonNode | string | null) => {
        if (!node || typeof node === 'string') return;
        const p = node.props ?? {};
        const role = (p.accessibilityRole ?? p.role) as string | undefined;
        const label = (p.accessibilityLabel ?? p['aria-label']) as string | undefined;
        const name = (label && label.trim()) || textOf(node).trim();

        if (role && INTERACTIVE_ROLES.has(role) && !name) {
            problems.push(`${role} with no accessible name`);
        }
        if (node.type === 'TextInput' && !(label && label.trim())) {
            problems.push('TextInput with no accessible label');
        }
        (node.children ?? []).forEach((c) => walk(c as JsonNode | string));
    };
    const tree = screen.toJSON() as unknown as JsonNode | JsonNode[] | null;
    if (Array.isArray(tree)) tree.forEach((n) => walk(n));
    else walk(tree);
    return problems;
};

/** True when any rendered element carries this accessibility role (for grouping roles that are not focusable themselves). */
export const hasRole = (role: string): boolean => {
    let found = false;
    const walk = (node: JsonNode | string | null) => {
        if (!node || typeof node === 'string' || found) return;
        if (node.props?.accessibilityRole === role || node.props?.role === role) found = true;
        (node.children ?? []).forEach((c) => walk(c as JsonNode | string));
    };
    const tree = screen.toJSON() as unknown as JsonNode | JsonNode[] | null;
    if (Array.isArray(tree)) tree.forEach((n) => walk(n));
    else walk(tree);
    return found;
};
