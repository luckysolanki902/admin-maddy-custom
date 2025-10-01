// /components/analytics/main/FunnelJourneyTree.js

'use client';

import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
} from 'react';
import {
  Box,
  Chip,
  Stack,
  Typography,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { analyticsPalette } from '../common/palette';

const DEFAULT_DATA = { nodes: [], links: [], stats: { sessions: 0 } };

const FALLBACK_MESSAGE = `We'll start drawing the journey story once enough first-party sessions roll in for this window.\nKeep an eye on it after fresh traffic or promo pushes to see how offers, cart views, and repeat journeys evolve.`;

const STAGE_ORDER = ['Landing', 'Browse', 'Consider', 'Checkout', 'Loyalty'];

const STAGE_STYLES = {
  Landing: {
    label: 'Landing hubs',
    color: '#38BDF8',
    accent: '#0EA5E9',
    soft: 'rgba(14,165,233,0.12)',
  },
  Browse: {
    label: 'Product discovery',
    color: '#A855F7',
    accent: '#9333EA',
    soft: 'rgba(147,51,234,0.12)',
  },
  Consider: {
    label: 'Consideration',
    color: '#F472B6',
    accent: '#DB2777',
    soft: 'rgba(219,39,119,0.1)',
  },
  Checkout: {
    label: 'Checkout flow',
    color: '#FB923C',
    accent: '#F97316',
    soft: 'rgba(249,115,22,0.1)',
  },
  Loyalty: {
    label: 'Loyalty & returns',
    color: '#34D399',
    accent: '#059669',
    soft: 'rgba(5,150,105,0.1)',
  },
  Other: {
    label: 'Explorations',
    color: analyticsPalette.neutral,
    accent: '#475569',
    soft: 'rgba(100,116,139,0.08)',
  },
};

const NODE_META = {
  landing_home: {
    stage: 'Landing',
    label: 'Home Landing',
    hint: 'Sessions that kicked off on the storefront home.',
  },
  landing_list: {
    stage: 'Landing',
    label: 'Product List Landing',
    hint: 'Direct landings on category or listing pages.',
  },
  landing_pdp: {
    stage: 'Landing',
    label: 'Product Detail Landing',
    hint: 'Traffic that begins on PDPs via ads or shares.',
  },
  landing_other: {
    stage: 'Landing',
    label: 'Other Landing',
    hint: 'Blogs, collection pages, or other entry points.',
  },
  view_content: {
    stage: 'Browse',
    label: 'Viewed Product',
    hint: 'Users exploring product details or media.',
  },
  add_to_cart: {
    stage: 'Consider',
    label: 'Added to Cart',
    hint: 'Direct adds from PDP, product list, or quick add.',
  },
  view_cart: {
    stage: 'Consider',
    label: 'Viewed Cart',
    optional: true,
    hint: 'Cart drawer or page opened before checkout.',
  },
  apply_offer: {
    stage: 'Consider',
    label: 'Offer Applied',
    optional: true,
    hint: 'Coupons or auto-offers used before checkout.',
  },
  open_order_form: {
    stage: 'Checkout',
    label: 'Order Form Opened',
    hint: 'Checkout flow launched (COD or prepaid).',
  },
  address_tab: {
    stage: 'Checkout',
    label: 'Address Tab',
    hint: 'Address step viewed in the order form.',
  },
  contact_info: {
    stage: 'Checkout',
    label: 'Contact Info Submitted',
    hint: 'Phone/email captured inside the order flow.',
  },
  initiate_checkout: {
    stage: 'Checkout',
    label: 'Checkout Initiated',
    hint: 'Checkout trigger fired (analytics parity).',
  },
  payment_initiated: {
    stage: 'Checkout',
    label: 'Payment Started',
    hint: 'Payment gateway hand-off or COD confirmation.',
  },
  purchase: {
    stage: 'Checkout',
    label: 'Purchase Completed',
    hint: 'Successful order placements in the window.',
  },
  session_return: {
    stage: 'Loyalty',
    label: 'Session Return',
    hint: 'Returning visitors revisiting after a break.',
  },
  repeat_purchase: {
    stage: 'Loyalty',
    label: 'Repeat Purchase',
    hint: 'Reorders placed after a returning session.',
  },
};

const OPTIONAL_STEPS = new Set(
  Object.entries(NODE_META)
    .filter(([, meta]) => meta.optional)
    .map(([key]) => key)
);

function useContainerSize(initialHeight = 420) {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: initialHeight });

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height || initialHeight });
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const { width, height } = entry.contentRect;
          setSize({ width, height: height || initialHeight });
        });
      });
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [initialHeight]);

  return [ref, size];
}

function enrichData(rawData) {
  const base = rawData || DEFAULT_DATA;
  const nodes = (base.nodes || []).map((node) => {
    const key = node.key || node.name || String(node.index);
    const meta = NODE_META[key] || {};
    const stage = meta.stage || 'Other';
    const stageIndex = Math.max(0, STAGE_ORDER.indexOf(stage));
    const stageStyle = STAGE_STYLES[stage] || STAGE_STYLES.Other;
    return {
      ...node,
      id: key,
      key,
      stage,
      stageIndex,
      stageStyle,
      displayName: meta.label || node.name || key,
      optional: OPTIONAL_STEPS.has(key),
      hint: meta.hint,
    };
  });

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const nodesByIndex = new Map(nodes.map((node, idx) => [idx, node]));

  const resolveNode = (value) => {
    if (value && typeof value === 'object' && ('id' in value || 'key' in value)) {
      return value;
    }
    if (typeof value === 'string') {
      return nodesById.get(value);
    }
    if (typeof value === 'number') {
      return nodesByIndex.get(value);
    }
    return null;
  };

  const links = (base.links || []).map((link, idx) => {
    const decorated = { ...link };
    if (!decorated.id) decorated.id = `${decorated.sourceName || decorated.source}-${decorated.targetName || decorated.target}-${idx}`;
    const sourceNode = resolveNode(decorated.source);
    const targetNode = resolveNode(decorated.target);

    if (sourceNode) {
      decorated.source = sourceNode;
      if (!decorated.sourceName) {
        decorated.sourceName = sourceNode.displayName || sourceNode.name || sourceNode.key;
      }
    }
    if (targetNode) {
      decorated.target = targetNode;
      if (!decorated.targetName) {
        decorated.targetName = targetNode.displayName || targetNode.name || targetNode.key;
      }
    }
    return decorated;
  });

  return {
    nodes,
    links,
    stats: base.stats || DEFAULT_DATA.stats,
  };
}

function buildSankeyLayout(enriched, width, height) {
  if (!width || !height) return null;

  const leftMargin = 120;
  const rightMargin = 150;
  const topMargin = 56;
  const bottomMargin = 36;
  const innerWidth = Math.max(1, width - leftMargin - rightMargin);
  const innerHeight = Math.max(1, height - topMargin - bottomMargin);

  // Deep clone nodes and ensure d3-sankey required arrays exist
  const nodes = enriched.nodes.map((node) => ({
    ...node,
    sourceLinks: [],
    targetLinks: [],
  }));

  // Deep clone links and resolve node references
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const links = enriched.links.map((link) => {
    const sourceNode = typeof link.source === 'object' ? nodeMap.get(link.source.id) : nodeMap.get(link.source);
    const targetNode = typeof link.target === 'object' ? nodeMap.get(link.target.id) : nodeMap.get(link.target);
    
    if (!sourceNode || !targetNode) {
      console.warn('[FunnelJourneyTree] Skipping link with missing nodes:', link);
      return null;
    }

    return {
      ...link,
      source: sourceNode,
      target: targetNode,
    };
  }).filter(Boolean);

  const generator = sankey()
    .nodeId((node) => node.id)
    .nodeWidth(22)
    .nodePadding(30)
    .nodeAlign((node) => node.stageIndex ?? node.depth ?? 0)
    .nodeSort((a, b) => (b.count || 0) - (a.count || 0))
    .linkSort((a, b) => (b.value || 0) - (a.value || 0))
    .extent([
      [leftMargin, topMargin],
      [leftMargin + innerWidth, topMargin + innerHeight],
    ])
    .iterations(96);

  let layout;
  try {
    layout = generator({ nodes, links });
  } catch (error) {
    console.error('[FunnelJourneyTree] Sankey layout failed:', error);
    return null;
  }

  return {
    nodes: layout.nodes,
    links: layout.links,
    margins: { left: leftMargin, right: rightMargin, top: topMargin, bottom: bottomMargin },
    innerSize: { width: innerWidth, height: innerHeight },
  };
}

const NodeTooltipContent = ({ node, totalSessions }) => {
  const share = totalSessions ? (node.count / totalSessions) * 100 : null;
  return (
    <Box sx={{ px: 1.5, py: 1, maxWidth: 260 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', mb: 0.75 }}>
        {node.displayName}
      </Typography>
      <Typography variant="body2" sx={{ color: 'rgba(235,235,235,0.9)' }}>
        {node.count?.toLocaleString('en-IN') || 0} sessions
      </Typography>
      {typeof share === 'number' && (
        <Typography variant="caption" sx={{ color: 'rgba(220,220,220,0.75)', display: 'block', mt: 0.5 }}>
          {share.toFixed(1)}% of journeys flow through here.
        </Typography>
      )}
      {node.hint && (
        <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.6)', display: 'block', mt: 1 }}>
          {node.hint}
        </Typography>
      )}
    </Box>
  );
};

const LinkTooltipContent = ({ link, totalSessions }) => {
  const share = typeof link.share === 'number'
    ? link.share
    : totalSessions
      ? (link.value / totalSessions) * 100
      : null;

  return (
    <Box sx={{ px: 1.5, py: 1, maxWidth: 260 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', mb: 0.75 }}>
        {link.sourceName} → {link.targetName}
      </Typography>
      <Typography variant="body2" sx={{ color: 'rgba(235,235,235,0.9)' }}>
        {link.value?.toLocaleString('en-IN') || 0} journeys
      </Typography>
      {typeof share === 'number' && (
        <Typography variant="caption" sx={{ color: 'rgba(220,220,220,0.75)', display: 'block', mt: 0.5 }}>
          {share.toFixed(1)}% of sessions follow this branch.
        </Typography>
      )}
    </Box>
  );
};

const FunnelJourneyTree = ({ data }) => {
  const theme = useTheme();
  const enriched = useMemo(() => enrichData(data), [data]);
  const { nodes, links, stats } = enriched;
  const totalSessions = stats?.sessions || 0;
  const isEmpty = !nodes.length || !links.length || totalSessions === 0;

  const [containerRef, size] = useContainerSize();

  const layout = useMemo(() => {
    if (isEmpty) return null;
    return buildSankeyLayout(enriched, size.width, size.height);
  }, [enriched, size.width, size.height, isEmpty]);

  const [activeNode, setActiveNode] = useState(null);
  const [activeLink, setActiveLink] = useState(null);

  const { highlightedNodes, highlightedLinks } = useMemo(() => {
    if (!layout) return { highlightedNodes: new Set(), highlightedLinks: new Set() };
    const nodeSet = new Set();
    const linkSet = new Set();

    if (activeNode) {
      nodeSet.add(activeNode);
      layout.links.forEach((link, idx) => {
        if (link.source.id === activeNode || link.target.id === activeNode) {
          linkSet.add(idx);
          nodeSet.add(link.source.id);
          nodeSet.add(link.target.id);
        }
      });
    }

    if (activeLink !== null) {
      const link = layout.links[activeLink];
      if (link) {
        linkSet.add(activeLink);
        nodeSet.add(link.source.id);
        nodeSet.add(link.target.id);
      }
    }

    return { highlightedNodes: nodeSet, highlightedLinks: linkSet };
  }, [layout, activeNode, activeLink]);

  const linkGenerator = useMemo(() => sankeyLinkHorizontal(), []);

  const topBranches = useMemo(() => {
    if (!links.length || !totalSessions) return [];
    return [...links]
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((link) => ({
        label: `${link.sourceName} → ${link.targetName}`,
        share: (link.value / totalSessions) * 100,
      }));
  }, [links, totalSessions]);

  const sessionReturns = nodes.find((node) => node.id === 'session_return')?.count || 0;
  const repeatPurchases = nodes.find((node) => node.id === 'repeat_purchase')?.count || 0;
  const offerApplies = nodes.find((node) => node.id === 'apply_offer')?.count || 0;

  const optionalHighlights = useMemo(() => {
    return nodes
      .filter((node) => node.optional && (node.count || 0) > 0)
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 2);
  }, [nodes]);

  const stageBands = useMemo(() => {
    if (!layout) return [];
    const { margins, innerSize } = layout;
    const fallbackSpacing = innerSize.width / Math.max(1, STAGE_ORDER.length - 1);
    const stagePositions = STAGE_ORDER.map((stage, idx) => {
      const stageNodes = layout.nodes.filter((node) => node.stage === stage);
      if (stageNodes.length) {
        const avg = stageNodes.reduce(
          (acc, node) => acc + (node.x0 + node.x1) / 2,
          0
        ) / stageNodes.length;
        return { stage, center: avg };
      }
      return {
        stage,
        center: margins.left + idx * fallbackSpacing,
      };
    });

    const rightEdge = margins.left + innerSize.width;
    return stagePositions.map((pos, idx) => {
      const prev = stagePositions[idx - 1];
      const next = stagePositions[idx + 1];
      const start = idx === 0 ? margins.left : (prev.center + pos.center) / 2;
      const end = idx === stagePositions.length - 1 ? rightEdge : (pos.center + next.center) / 2;
      return {
        stage: pos.stage,
        x: start,
        width: Math.max(60, end - start),
        center: pos.center,
      };
    });
  }, [layout]);

  const gradients = useMemo(() => {
    if (!layout) return [];
    return layout.links.map((link, idx) => {
      const sourceColor = link.source.stageStyle?.accent || '#8884d8';
      const targetColor = link.target.stageStyle?.color || '#82ca9d';
      const gradientId = `funnel-link-${idx}`;
      const x1 = link.source.x1;
      const y1 = (link.source.y0 + link.source.y1) / 2;
      const x2 = link.target.x0;
      const y2 = (link.target.y0 + link.target.y1) / 2;
      return (
        <linearGradient
          key={gradientId}
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
        >
          <stop offset="0%" stopColor={alpha(sourceColor, 0.95)} stopOpacity={0.75} />
          <stop offset="100%" stopColor={alpha(targetColor, 0.95)} stopOpacity={0.9} />
        </linearGradient>
      );
    });
  }, [layout]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 500 }}>
            Funnel Journey Tree
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(235,235,235,0.68)', mt: 0.5 }}>
            Follow how landing hubs branch into micro-steps like cart opens, offer applies, returns, and repeat orders. Hover each
            branch to spotlight the journeys fuelling your reorder flywheel.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          <Chip
            size="small"
            label={`Sessions: ${totalSessions.toLocaleString('en-IN')}`}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#f5f5f5',
              fontWeight: 600,
            }}
          />
          {sessionReturns > 0 && (
            <Chip
              size="small"
              label={`Session Returns: ${sessionReturns.toLocaleString('en-IN')}`}
              sx={{
                backgroundColor: alpha(STAGE_STYLES.Loyalty.color, 0.18),
                border: `1px solid ${alpha(STAGE_STYLES.Loyalty.accent, 0.45)}`,
                color: '#fff',
                fontWeight: 600,
              }}
            />
          )}
          {repeatPurchases > 0 && (
            <Chip
              size="small"
              label={`Repeat Orders: ${repeatPurchases.toLocaleString('en-IN')}`}
              sx={{
                backgroundColor: alpha(STAGE_STYLES.Loyalty.color, 0.28),
                border: `1px solid ${alpha(STAGE_STYLES.Loyalty.accent, 0.55)}`,
                color: '#fff',
                fontWeight: 600,
              }}
            />
          )}
          {offerApplies > 0 && (
            <Chip
              size="small"
              label={`Offers Applied: ${offerApplies.toLocaleString('en-IN')}`}
              sx={{
                backgroundColor: alpha(STAGE_STYLES.Consider.color, 0.18),
                border: `1px solid ${alpha(STAGE_STYLES.Consider.accent, 0.45)}`,
                color: '#fff',
                fontWeight: 600,
              }}
            />
          )}
          {topBranches.map((branch) => (
            <Chip
              key={branch.label}
              size="small"
              label={`${branch.label} · ${branch.share.toFixed(1)}%`}
              sx={{
                backgroundColor: alpha(theme.palette.primary.main, 0.18),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                color: '#fff',
                fontWeight: 600,
              }}
            />
          ))}
          {optionalHighlights.map((node) => (
            <Chip
              key={node.id}
              size="small"
              label={`${node.displayName} · ${node.count?.toLocaleString('en-IN') || 0}`}
              sx={{
                backgroundColor: alpha(node.stageStyle?.color || '#fff', 0.16),
                border: `1px solid ${alpha(node.stageStyle?.accent || '#fff', 0.4)}`,
                color: '#fff',
                fontWeight: 600,
              }}
            />
          ))}
        </Stack>
      </Box>

      {isEmpty ? (
        <Box
          sx={{
            border: '1px dashed rgba(255,255,255,0.12)',
            borderRadius: 2,
            backgroundColor: 'rgba(10,10,10,0.35)',
            py: 6,
            px: 4,
          }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(235,235,235,0.75)', whiteSpace: 'pre-wrap' }}>
            {FALLBACK_MESSAGE}
          </Typography>
        </Box>
      ) : (
        <Box
          ref={containerRef}
          sx={{ position: 'relative', width: '100%', height: { xs: 420, md: 440 }, borderRadius: 2 }}
        >
          {layout ? (
            <svg width={size.width} height={size.height}>
              <defs>
                {gradients}
                <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="rgba(0,0,0,0.45)" />
                </filter>
              </defs>

              {stageBands.map((band) => {
                const stageStyle = STAGE_STYLES[band.stage] || STAGE_STYLES.Other;
                return (
                  <g key={`${band.stage}-band`}>
                    <rect
                      x={band.x}
                      y={layout.margins.top - 32}
                      width={band.width}
                      height={layout.innerSize.height + 48}
                      fill={stageStyle.soft}
                      rx={18}
                    />
                    <text
                      x={band.center}
                      y={layout.margins.top - 38}
                      textAnchor="middle"
                      fill={alpha(stageStyle.accent, 0.8)}
                      style={{ fontWeight: 600, fontSize: 13, letterSpacing: '0.04em' }}
                    >
                      {STAGE_STYLES[band.stage]?.label || band.stage}
                    </text>
                  </g>
                );
              })}

              {layout.links.map((link, idx) => {
                const gradientId = `funnel-link-${idx}`;
                const isDimmed = highlightedLinks.size > 0 && !highlightedLinks.has(idx);
                const strokeWidth = Math.max(link.width, 2.5) + (highlightedLinks.has(idx) ? 4 : 0);
                return (
                  <Tooltip
                    key={link.id}
                    arrow
                    enterTouchDelay={0}
                    title={<LinkTooltipContent link={link} totalSessions={totalSessions} />}
                  >
                    <path
                      d={linkGenerator(link)}
                      fill="none"
                      stroke={`url(#${gradientId})`}
                      strokeWidth={strokeWidth}
                      strokeOpacity={isDimmed ? 0.12 : 0.82}
                      strokeLinecap="round"
                      onMouseEnter={() => setActiveLink(idx)}
                      onMouseLeave={() => setActiveLink(null)}
                      style={{ cursor: 'pointer', transition: 'stroke-opacity 0.2s ease, stroke-width 0.2s ease' }}
                    />
                  </Tooltip>
                );
              })}

              {layout.nodes.map((node) => {
                const width = node.x1 - node.x0;
                const height = node.y1 - node.y0;
                const centerY = node.y0 + height / 2;
                const isDimmed = highlightedNodes.size > 0 && !highlightedNodes.has(node.id);
                const stageStyle = STAGE_STYLES[node.stage] || STAGE_STYLES.Other;
                const share = totalSessions ? (node.count / totalSessions) * 100 : null;

                return (
                  <Tooltip
                    key={node.id}
                    arrow
                    enterTouchDelay={0}
                    title={<NodeTooltipContent node={node} totalSessions={totalSessions} />}
                  >
                    <g
                      onMouseEnter={() => setActiveNode(node.id)}
                      onMouseLeave={() => setActiveNode(null)}
                      style={{ cursor: 'pointer', transition: 'opacity 0.2s ease, transform 0.2s ease' }}
                      opacity={isDimmed ? 0.2 : 1}
                    >
                      <rect
                        x={node.x0}
                        y={node.y0}
                        width={width}
                        height={height}
                        rx={12}
                        fill={alpha(stageStyle.color, 0.82)}
                        stroke={alpha(stageStyle.accent, 0.9)}
                        strokeWidth={highlightedNodes.has(node.id) ? 1.6 : 1.1}
                        filter="url(#node-shadow)"
                      />
                      {node.optional && (
                        <text
                          x={node.x0 + width / 2}
                          y={node.y0 - 8}
                          textAnchor="middle"
                          fill={alpha(stageStyle.accent, 0.85)}
                          style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}
                        >
                          Optional
                        </text>
                      )}
                      <text
                        x={node.x1 + 16}
                        y={centerY - 4}
                        fill="rgba(245,245,245,0.92)"
                        fontSize={13}
                        fontWeight={600}
                        textAnchor="start"
                        alignmentBaseline="middle"
                      >
                        {node.displayName}
                      </text>
                      <text
                        x={node.x1 + 16}
                        y={centerY + 14}
                        fill="rgba(220,220,220,0.7)"
                        fontSize={11}
                        fontWeight={400}
                        textAnchor="start"
                        alignmentBaseline="middle"
                      >
                        {(node.count || 0).toLocaleString('en-IN')} sessions
                        {typeof share === 'number' ? ` • ${share.toFixed(1)}%` : ''}
                      </text>
                    </g>
                  </Tooltip>
                );
              })}
            </svg>
          ) : (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(230,230,230,0.6)',
                fontSize: 14,
                letterSpacing: '0.08em',
              }}
            >
              Calculating journey layout…
            </Box>
          )}
        </Box>
      )}

      <Typography variant="caption" sx={{ color: 'rgba(200,200,200,0.6)' }}>
        Tip: Slice by date range or UTM filters to compare how offers, returns, or checkout friction shift the journey mix.
      </Typography>
    </Box>
  );
};

export default FunnelJourneyTree;
