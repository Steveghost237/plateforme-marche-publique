import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:url_launcher/url_launcher.dart';

// ── URLs réseaux sociaux ComeBuy ────────────────────────────────────────────
const _kFacebookUrl  = 'https://www.facebook.com/comebuy237';
const _kInstagramUrl = 'https://www.instagram.com/comebuy237';
const _kTiktokUrl    = 'https://www.tiktok.com/@comebuy237';

// ── SVG brand icons ─────────────────────────────────────────────────────────
const _svgFacebook = '''
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path fill="#fff" d="M24 12.073C24 5.446 18.627 0 12 0S0 5.446 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971h-1.514c-1.491 0-1.956.932-1.956 1.888v2.262h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
</svg>''';

const _svgInstagram = '''
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path fill="#fff" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
</svg>''';

const _svgTiktok = '''
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path fill="#fff" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.2 8.2 0 0 0 4.81 1.55V6.79a4.85 4.85 0 0 1-1.04-.1z"/>
</svg>''';

// ── Modèle réseau social ─────────────────────────────────────────────────────
class _SocialNetwork {
  final String name;
  final String url;
  final String svgIcon;
  final Color color;
  final Color shadowColor;

  const _SocialNetwork({
    required this.name,
    required this.url,
    required this.svgIcon,
    required this.color,
    required this.shadowColor,
  });
}

const _networks = [
  _SocialNetwork(
    name: 'Facebook',
    url: _kFacebookUrl,
    svgIcon: _svgFacebook,
    color: Color(0xFF1877F2),
    shadowColor: Color(0x441877F2),
  ),
  _SocialNetwork(
    name: 'Instagram',
    url: _kInstagramUrl,
    svgIcon: _svgInstagram,
    color: Color(0xFFE1306C),
    shadowColor: Color(0x44E1306C),
  ),
  _SocialNetwork(
    name: 'TikTok',
    url: _kTiktokUrl,
    svgIcon: _svgTiktok,
    color: Color(0xFF010101),
    shadowColor: Color(0x44010101),
  ),
];

// ════════════════════════════════════════════════════════════════════════════
// Widget principal — barre réseaux sociaux
// ════════════════════════════════════════════════════════════════════════════

/// [SocialMediaBar] — Affiche des boutons animés Facebook / Instagram / TikTok.
///
/// Paramètres :
/// - [label]   : texte au-dessus des boutons (null = masqué)
/// - [style]   : 'icon'  → cercles compacts  (défaut)
///               'chip'  → pilules avec libellé
///               'card'  → carte large avec description
class SocialMediaBar extends StatelessWidget {
  final String? label;
  final String style; // 'icon' | 'chip' | 'card'

  const SocialMediaBar({
    super.key,
    this.label,
    this.style = 'icon',
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Colors.grey[600],
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 10),
        ],
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (int i = 0; i < _networks.length; i++) ...[
              if (i > 0) const SizedBox(width: 12),
              _SocialButton(network: _networks[i], style: style),
            ],
          ],
        ),
      ],
    );
  }
}

// ── Bouton individuel animé ──────────────────────────────────────────────────
class _SocialButton extends StatefulWidget {
  final _SocialNetwork network;
  final String style;
  const _SocialButton({required this.network, required this.style});

  @override
  State<_SocialButton> createState() => _SocialButtonState();
}

class _SocialButtonState extends State<_SocialButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;
  bool _pressed = false;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 120),
      lowerBound: 0.85,
      upperBound: 1.0,
      value: 1.0,
    );
    _scale = _ctrl;
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _open() async {
    final uri = Uri.parse(widget.network.url);
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {}
  }

  void _onTapDown(_) {
    setState(() => _pressed = true);
    _ctrl.reverse();
  }

  void _onTapUp(_) {
    setState(() => _pressed = false);
    _ctrl.forward();
    _open();
  }

  void _onTapCancel() {
    setState(() => _pressed = false);
    _ctrl.forward();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      child: ScaleTransition(
        scale: _scale,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    final n = widget.network;
    switch (widget.style) {
      case 'chip':
        return _buildChip(n);
      case 'card':
        return _buildCard(n);
      default:
        return _buildIcon(n);
    }
  }

  // ── Style : cercle icône ──────────────────────────────────────────────────
  Widget _buildIcon(_SocialNetwork n) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: n.color,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: _pressed ? n.shadowColor.withOpacity(.7) : n.shadowColor,
            blurRadius: _pressed ? 12 : 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Center(
        child: SvgPicture.string(n.svgIcon, width: 22, height: 22),
      ),
    );
  }

  // ── Style : pilule avec libellé ───────────────────────────────────────────
  Widget _buildChip(_SocialNetwork n) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: n.color,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: _pressed ? n.shadowColor.withOpacity(.7) : n.shadowColor,
            blurRadius: _pressed ? 12 : 6,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SvgPicture.string(n.svgIcon, width: 18, height: 18),
          const SizedBox(width: 8),
          Text(
            n.name,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  // ── Style : carte large ───────────────────────────────────────────────────
  Widget _buildCard(_SocialNetwork n) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      width: 90,
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: BoxDecoration(
        color: n.color.withOpacity(.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: n.color.withOpacity(.3), width: 1.5),
        boxShadow: _pressed
            ? [BoxShadow(color: n.shadowColor, blurRadius: 10, offset: const Offset(0, 4))]
            : [],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(color: n.color, shape: BoxShape.circle),
            child: Center(child: SvgPicture.string(n.svgIcon, width: 20, height: 20)),
          ),
          const SizedBox(height: 8),
          Text(
            n.name,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: n.color,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
