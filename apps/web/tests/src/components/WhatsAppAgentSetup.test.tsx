import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WhatsAppAgentSetup from '@/components/WhatsAppAgentSetup';

const mockT = (key: string) => {
  const map: Record<string, string> = {
    'auto.whatsapp_agent_coming_soon_title': 'Coming Soon — Future Work',
    'auto.whatsapp_agent_coming_soon_desc':
      'The WhatsApp AI Agent is coming soon.',
    'auto.whatsapp_agent': 'WhatsApp AI Agent',
    'auto.whatsapp_agent_status': 'Status: Alpha — In Development',
    'auto.whatsapp_agent_ai': 'AI-Powered Sales',
    'auto.whatsapp_agent_ai_desc': 'AI agent description',
    'auto.whatsapp_agent_multi': 'Multi-Language',
    'auto.whatsapp_agent_multi_desc': 'Multi-language description',
    'auto.whatsapp_agent_upi': 'UPI Payments',
    'auto.whatsapp_agent_upi_desc': 'UPI description',
    'auto.whatsapp_agent_memory': 'Conversation Memory',
    'auto.whatsapp_agent_memory_desc': 'Memory description',
    'auto.whatsapp_agent_store': 'Your Store',
    'auto.whatsapp_agent_slug': 'Slug',
    'auto.whatsapp_agent_activate': 'Activate Agent',
    'auto.whatsapp_agent_preview': 'Preview',
    'auto.whatsapp_agent_disabled': 'Buttons disabled',
  };
  return map[key] || key;
};

describe('WhatsAppAgentSetup', () => {
  it('renders coming soon banner', () => {
    render(<WhatsAppAgentSetup seller={null} t={mockT} />);
    expect(screen.getByText('Coming Soon — Future Work')).toBeInTheDocument();
  });

  it('renders agent title and status', () => {
    render(<WhatsAppAgentSetup seller={null} t={mockT} />);
    expect(screen.getByText('WhatsApp AI Agent')).toBeInTheDocument();
    expect(
      screen.getByText('Status: Alpha — In Development'),
    ).toBeInTheDocument();
  });

  it('renders all four feature cards', () => {
    render(<WhatsAppAgentSetup seller={null} t={mockT} />);
    expect(screen.getByText('AI-Powered Sales')).toBeInTheDocument();
    expect(screen.getByText('Multi-Language')).toBeInTheDocument();
    expect(screen.getByText('UPI Payments')).toBeInTheDocument();
    expect(screen.getByText('Conversation Memory')).toBeInTheDocument();
  });

  it('renders with seller store info', () => {
    const seller = { store_name: 'My Store', store_slug: 'my-store' };
    render(<WhatsAppAgentSetup seller={seller} t={mockT} />);
    expect(screen.getByText(/Your Store/)).toBeInTheDocument();
    expect(screen.getByText(/My Store/)).toBeInTheDocument();
    expect(screen.getByText(/my-store/)).toBeInTheDocument();
  });

  it('renders store section label with colon', () => {
    render(<WhatsAppAgentSetup seller={null} t={mockT} />);
    expect(screen.getByText(/Your Store:/)).toBeInTheDocument();
  });

  it('shows fallback dashes when seller is null', () => {
    render(<WhatsAppAgentSetup seller={null} t={mockT} />);
    const emDashElements = screen.getAllByText(/—/);
    expect(emDashElements.length).toBeGreaterThanOrEqual(2);
  });

  it('renders disabled activate and preview buttons', () => {
    render(<WhatsAppAgentSetup seller={null} t={mockT} />);
    const activateBtn = screen.getByText('Activate Agent').closest('button');
    const previewBtn = screen.getByText('Preview').closest('button');
    expect(activateBtn).toBeDisabled();
    expect(previewBtn).toBeDisabled();
  });

  it('renders disabled notice text', () => {
    render(<WhatsAppAgentSetup seller={null} t={mockT} />);
    expect(screen.getByText('Buttons disabled')).toBeInTheDocument();
  });

  it('renders feature descriptions', () => {
    render(<WhatsAppAgentSetup seller={null} t={mockT} />);
    expect(screen.getByText('AI agent description')).toBeInTheDocument();
    expect(screen.getByText('Multi-language description')).toBeInTheDocument();
  });

  it('uses fallback text when t returns empty strings', () => {
    const emptyT = () => '';
    render(<WhatsAppAgentSetup seller={null} t={emptyT} />);
    expect(screen.getByText('Coming Soon — Future Work')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp AI Agent')).toBeInTheDocument();
    expect(
      screen.getByText('Status: Alpha — In Development'),
    ).toBeInTheDocument();
    expect(screen.getByText('AI-Powered Sales')).toBeInTheDocument();
    expect(screen.getByText('Multi-Language')).toBeInTheDocument();
    expect(screen.getByText('UPI Payments')).toBeInTheDocument();
    expect(screen.getByText('Conversation Memory')).toBeInTheDocument();
    expect(screen.getByText(/Your Store/)).toBeInTheDocument();
    expect(screen.getByText(/Slug/)).toBeInTheDocument();
    expect(screen.getByText('Activate Agent')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText(/Buttons disabled/)).toBeInTheDocument();
  });
});
