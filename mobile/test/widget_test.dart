import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:marche_mobile/main.dart';

void main() {
  testWidgets('App builds and shows splash screen', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const MarcheApp());
    await tester.pump();

    expect(find.text('Marché en Ligne'), findsOneWidget);

    // Laisse le splash terminer son délai et naviguer vers le login
    await tester.pump(const Duration(seconds: 3));
    await tester.pump();
  });
}
