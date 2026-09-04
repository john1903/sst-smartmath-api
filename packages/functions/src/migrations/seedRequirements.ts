import { Resource } from "sst";
import { batchPutAll } from "@smartmath/utils/dynamodb";
import type { RequirementItem } from "@smartmath/core/requirements";

const SEED: RequirementItem[] = [
  {
    id: "real-numbers-performs-operations-addition-subtraction-multiplication-division",
    categoryId: "real-numbers",
    translations: { "en-GB": "Performs operations (addition, subtraction, multiplication, division, exponentiation, root extraction, logarithms) in the set of real numbers.", "pl-PL": "Wykonuje działania (dodawanie, odejmowanie, mnożenie, dzielenie, potęgowanie, pierwiastkowanie, logarytmowanie) w zbiorze liczb rzeczywistych." },
  },
  {
    id: "real-numbers-performs-simple-proofs-related-divisibility-integers",
    categoryId: "real-numbers",
    translations: { "en-GB": "Performs simple proofs related to divisibility of integers and division remainders, e.g., divisibility by 24 of the product of four consecutive natural numbers, or proving that a number with remainder 3 modulo 4 cannot be a perfect square.", "pl-PL": "Przeprowadza proste dowody dotyczące podzielności liczb całkowitych i reszt z dzielenia, np.: (a) dowód podzielności przez 24 iloczynu czterech kolejnych liczb naturalnych, (b) dowód własności: jeśli liczba przy dzieleniu przez 4 daje resztę 3, to nie jest kwadratem liczby całkowitej." },
  },
  {
    id: "real-numbers-applies-properties-roots-degree-including-odd",
    categoryId: "real-numbers",
    translations: { "en-GB": "Applies properties of roots of any degree, including odd roots of negative numbers.", "pl-PL": "Stosuje własności pierwiastków dowolnego stopnia, w tym pierwiastków stopnia nieparzystego z liczb ujemnych." },
  },
  {
    id: "real-numbers-uses-relationship-between-roots-powers-applies",
    categoryId: "real-numbers",
    translations: { "en-GB": "Uses the relationship between roots and powers, and applies laws of operations on exponents and roots.", "pl-PL": "Stosuje związek pierwiastkowania z potęgowaniem oraz prawa działań na potęgach i pierwiastkach." },
  },
  {
    id: "real-numbers-applies-monotonicity-exponentiation-x-y-1",
    categoryId: "real-numbers",
    translations: { "en-GB": "Applies monotonicity of exponentiation, e.g., if x < y and a > 1 then a^x < a^y; if x < y and 0 < a < 1 then a^x > a^y.", "pl-PL": "Stosuje monotoniczność potęgowania, w szczególności własności: jeśli x < y oraz a > 1, to a^x < a^y, zaś gdy x < y i 0 < a < 1 to a^x > a^y." },
  },
  {
    id: "real-numbers-uses-concept-intervals-marks-them-number",
    categoryId: "real-numbers",
    translations: { "en-GB": "Uses the concept of intervals and marks them on the number line.", "pl-PL": "Posługuje się pojęciem przedziału liczbowego, zaznacza przedziały na osi liczbowej." },
  },
  {
    id: "real-numbers-applies-geometric-algebraic-interpretations-absolute-value",
    categoryId: "real-numbers",
    translations: { "en-GB": "Applies geometric and algebraic interpretations of absolute value; solves equations such as |x+4| = 5, |x−2| < 3, |x+3| > 4.", "pl-PL": "Stosuje interpretację geometryczną i algebraiczną wartości bezwzględnej, rozwiązuje równania typu: |x+4| = 5, |x − 2| < 3, |x + 3| > 4." },
  },
  {
    id: "real-numbers-uses-properties-powers-roots-practical-contexts",
    categoryId: "real-numbers",
    translations: { "en-GB": "Uses properties of powers and roots in practical contexts, e.g., compound interest, investment returns, loan costs.", "pl-PL": "Wykorzystuje własności potęgowania i pierwiastkowania w sytuacjach praktycznych, w tym do obliczania procentów składanych, zysków z lokat i kosztów kredytów." },
  },
  {
    id: "real-numbers-applies-relationship-between-logarithms-exponents-uses",
    categoryId: "real-numbers",
    translations: { "en-GB": "Applies the relationship between logarithms and exponents; uses formulas for logarithm of a product, quotient, and power.", "pl-PL": "Stosuje związek logarytmowania z potęgowaniem, posługuje się wzorami na logarytm iloczynu, logarytm ilorazu i logarytm potęgi." },
  },
  {
    id: "algebraic-expressions-applies-special-product-formulas-b-2",
    categoryId: "algebraic-expressions",
    translations: { "en-GB": "Applies special product formulas: (a+b)^2, (a−b)^2, a^2−b^2.", "pl-PL": "Stosuje wzory skróconego mnożenia na: (a+b)^2, (a−b)^2, a^2−b^2;" },
  },
  {
    id: "algebraic-expressions-adds-subtracts-multiplies-polynomials-one-more",
    categoryId: "algebraic-expressions",
    translations: { "en-GB": "Adds, subtracts, and multiplies polynomials in one or more variables.", "pl-PL": "Dodaje, odejmuje i mnoży wielomiany jednej i wielu zmiennych;" },
  },
  {
    id: "algebraic-expressions-factors-out-monomial-algebraic-sum",
    categoryId: "algebraic-expressions",
    translations: { "en-GB": "Factors out a monomial from an algebraic sum.", "pl-PL": "Wyłącza poza nawias jednomian z sumy algebraicznej;" },
  },
  {
    id: "algebraic-expressions-factors-polynomials-extracting-common-factor-grouping",
    categoryId: "algebraic-expressions",
    translations: { "en-GB": "Factors polynomials by extracting the common factor and grouping terms, for cases no harder than factoring W(x) = 2x^3 − √3x^2 + 4x − 2√3.", "pl-PL": "Rozkłada wielomiany na czynniki metodą wyłączania wspólnego czynnika przed nawias oraz metodą grupowania wyrazów, w przypadkach nie trudniejszych niż rozkład wielomianu W(x) = 2x^3 − √3x^2 + 4x − 2√3;" },
  },
  {
    id: "algebraic-expressions-multiplies-divides-rational-expressions",
    categoryId: "algebraic-expressions",
    translations: { "en-GB": "Multiplies and divides rational expressions.", "pl-PL": "Mnoży i dzieli wyrażenia wymierne." },
  },
  {
    id: "algebraic-expressions-adds-subtracts-rational-expressions-cases-harder",
    categoryId: "algebraic-expressions",
    translations: { "en-GB": "Adds and subtracts rational expressions, in cases no harder than: 1/(x+1) − 1/x, 1/x + 1/x^2 + 1/x^3, (x+1)/(x+2) + (x−1)/(x+1).", "pl-PL": "Dodaje i odejmuje wyrażenia wymierne, w przypadkach nie trudniejszych niż: 1/(x+1) − 1/x, 1/x + 1/x^2 + 1/x^3, (x+1)/(x+2) + (x−1)/(x+1)." },
  },
  {
    id: "equations-and-inequalities-transforms-equations-inequalities-equivalently-transforms-equation",
    categoryId: "equations-and-inequalities",
    translations: { "en-GB": "Transforms equations and inequalities equivalently, e.g., transforms the equation 5x+1 = (x+3)/(2x−1) equivalently.", "pl-PL": "Przekształca równania i nierówności w sposób równoważny, w tym np. przekształca równoważnie równanie 5x+1 = (x+3)/(2x−1);" },
  },
  {
    id: "equations-and-inequalities-interprets-contradictory-identity-linear-equations-inequalities",
    categoryId: "equations-and-inequalities",
    translations: { "en-GB": "Interprets contradictory and identity linear equations and inequalities.", "pl-PL": "Interpretuje równania i nierówności liniowe sprzeczne oraz tożsamościowe;" },
  },
  {
    id: "equations-and-inequalities-solves-linear-inequalities-one-unknown",
    categoryId: "equations-and-inequalities",
    translations: { "en-GB": "Solves linear inequalities with one unknown.", "pl-PL": "Rozwiązuje nierówności liniowe z jedną niewiadomą;" },
  },
  {
    id: "equations-and-inequalities-solves-quadratic-equations-inequalities",
    categoryId: "equations-and-inequalities",
    translations: { "en-GB": "Solves quadratic equations and inequalities.", "pl-PL": "Rozwiązuje równania i nierówności kwadratowe;" },
  },
  {
    id: "equations-and-inequalities-solves-polynomial-equations-form-w-x",
    categoryId: "equations-and-inequalities",
    translations: { "en-GB": "Solves polynomial equations of the form W(x) = 0 for polynomials in factored form or reducible to factored form using factorization or grouping.", "pl-PL": "Rozwiązuje równania wielomianowe postaci W(x) = 0 dla wielomianów doprowadzonych do postaci iloczynowej, lub takich, które dają się doprowadzić do postaci iloczynowej metodą wyłączania wspólnego czynnika przed nawias lub metodą grupowania;" },
  },
  {
    id: "equations-and-inequalities-solves-rational-equations-form-v-x",
    categoryId: "equations-and-inequalities",
    translations: { "en-GB": "Solves rational equations of the form V(x)/W(x), where V(x) and W(x) are written in factored form.", "pl-PL": "Rozwiązuje równania wymierne postaci V(x)/W(x), gdzie wielomiany V(x) i W(x) są zapisane w postaci iloczynowej." },
  },
  {
    id: "systems-of-equations-solves-systems-linear-equations-two-variables",
    categoryId: "systems-of-equations",
    translations: { "en-GB": "Solves systems of linear equations with two variables, gives the geometric interpretation of consistent, inconsistent, and dependent systems;", "pl-PL": "Rozwiązuje układy równań liniowych z dwiema niewiadomymi, podaje interpretację geometryczną układów oznaczonych, nieoznaczonych i sprzecznych;" },
  },
  {
    id: "systems-of-equations-uses-systems-equations-solve-word-problems",
    categoryId: "systems-of-equations",
    translations: { "en-GB": "Uses systems of equations to solve word problems.", "pl-PL": "Stosuje układy równań do rozwiązywania zadań tekstowych." },
  },
  {
    id: "functions-defines-function-unique-assignment-using-verbal",
    categoryId: "functions",
    translations: { "en-GB": "Defines a function as a unique assignment using a verbal description, table, graph, or formula (including different formulas on different intervals);", "pl-PL": "Określa funkcje jako jednoznaczne przyporządkowanie za pomocą opisu słownego, tabeli, wykresu, wzoru (także różnymi wzorami na różnych przedziałach);" },
  },
  {
    id: "functions-calculates-value-function-given-algebraic-formula",
    categoryId: "functions",
    translations: { "en-GB": "Calculates the value of a function given by an algebraic formula;", "pl-PL": "Oblicza wartość funkcji zadanej wzorem algebraicznym;" },
  },
  {
    id: "functions-reads-interprets-function-values-defined-tables",
    categoryId: "functions",
    translations: { "en-GB": "Reads and interprets function values defined by tables, graphs, formulas, etc., including multiple uses of the same source or several sources simultaneously;", "pl-PL": "Odczytuje i interpretuje wartości funkcji określonych za pomocą tabel, wykresów, wzorów itp., również w sytuacjach wielokrotnego użycia tego samego źródła informacji lub kilku źródeł jednocześnie;" },
  },
  {
    id: "functions-function-graph-reads-domain-range-zeros",
    categoryId: "functions",
    translations: { "en-GB": "From a function graph, reads domain, range, zeros, intervals of monotonicity, intervals where the function takes values greater (not less) or smaller (not greater) than a given number, maximum and minimum values (if they exist) in a closed interval, and the arguments for which these values are attained;", "pl-PL": "Odczytuje z wykresu funkcji: dziedzinę, zbiór wartości, miejsca zerowe, przedziały monotoniczności, przedziały, w których funkcja przyjmuje wartości większe (nie mniejsze) lub mniejsze (nie większe) od danej liczby, największe i najmniejsze wartości funkcji (o ile istnieją) w danym przedziale domkniętym oraz argumenty, dla których wartości największe i najmniejsze są przez funkcję przyjmowane;" },
  },
  {
    id: "functions-interprets-coefficients-formula-linear-function",
    categoryId: "functions",
    translations: { "en-GB": "Interprets coefficients in the formula of a linear function;", "pl-PL": "Interpretuje współczynniki występujące we wzorze funkcji liniowej;" },
  },
  {
    id: "functions-determines-formula-linear-function-based-graph",
    categoryId: "functions",
    translations: { "en-GB": "Determines the formula of a linear function based on its graph or its properties;", "pl-PL": "Wyznacza wzór funkcji liniowej na podstawie informacji o jej wykresie lub o jej własnościach;" },
  },
  {
    id: "functions-sketches-graph-quadratic-function-given-formula",
    categoryId: "functions",
    translations: { "en-GB": "Sketches the graph of a quadratic function given by a formula;", "pl-PL": "Szkicuje wykres funkcji kwadratowej zadanej wzorem;" },
  },
  {
    id: "functions-interprets-coefficients-quadratic-function-general-canonical",
    categoryId: "functions",
    translations: { "en-GB": "Interprets the coefficients of a quadratic function in general, canonical, and factored form (if it exists);", "pl-PL": "Interpretuje współczynniki występujące we wzorze funkcji kwadratowej w postaci ogólnej, kanonicznej i iloczynowej (jeśli istnieje);" },
  },
  {
    id: "functions-finds-formula-quadratic-function-based-information",
    categoryId: "functions",
    translations: { "en-GB": "Finds the formula of a quadratic function based on information about the function or its graph;", "pl-PL": "Wyznacza wzór funkcji kwadratowej na podstawie informacji o tej funkcji lub o jej wykresie;" },
  },
  {
    id: "functions-finds-maximum-minimum-values-quadratic-function",
    categoryId: "functions",
    translations: { "en-GB": "Finds the maximum and minimum values of a quadratic function on a closed interval;", "pl-PL": "Wyznacza największą i najmniejszą wartość funkcji kwadratowej w przedziale domkniętym;" },
  },
  {
    id: "functions-uses-properties-linear-quadratic-functions-interpret",
    categoryId: "functions",
    translations: { "en-GB": "Uses properties of linear and quadratic functions to interpret geometric, physical, and practical problems;", "pl-PL": "Wykorzystuje własności funkcji liniowej i kwadratowej do interpretacji zagadnień geometrycznych, fizycznych itp., także osadzonych w kontekście praktycznym;" },
  },
  {
    id: "functions-based-graph-y-f-x-sketches",
    categoryId: "functions",
    translations: { "en-GB": "Based on the graph of y = f(x), sketches the graphs of y = f(x − a), y = f(x) + b, y = −f(x), y = f(−x);", "pl-PL": "Na podstawie wykresu funkcji y = f(x) szkicuje wykresy funkcji y = f(x − a), y = f(x) + b, y = −f(x), y = f(−x);" },
  },
  {
    id: "functions-uses-function-f-x-x-including",
    categoryId: "functions",
    translations: { "en-GB": "Uses the function f(x) = a / x, including its graph, to describe and interpret problems involving inversely proportional quantities, including practical applications;", "pl-PL": "Posługuje się funkcją f(x) = a / x, w tym jej wykresem, do opisu i interpretacji zagadnień związanych z wielkościami odwrotnie proporcjonalnymi, również w zastosowaniach praktycznych;" },
  },
  {
    id: "functions-uses-exponential-logarithmic-functions-including-their",
    categoryId: "functions",
    translations: { "en-GB": "Uses exponential and logarithmic functions, including their graphs, to describe and interpret problems related to practical applications;", "pl-PL": "Posługuje się funkcjami wykładniczą i logarytmiczną, w tym ich wykresami, do opisu i interpretacji zagadnień związanych z zastosowaniami praktycznymi;" },
  },
  {
    id: "sequences-calculates-terms-sequence-defined-general-formula",
    categoryId: "sequences",
    translations: { "en-GB": "Calculates terms of a sequence defined by a general formula.", "pl-PL": "Oblicza wyrazy ciągu określonego wzorem ogólnym." },
  },
  {
    id: "sequences-calculates-initial-terms-recursively-defined-sequences",
    categoryId: "sequences",
    translations: { "en-GB": "Calculates initial terms of recursively defined sequences.", "pl-PL": "Oblicza początkowe wyrazy ciągów określonych rekurencyjnie." },
  },
  {
    id: "sequences-simple-cases-determines-whether-sequence-increasing",
    categoryId: "sequences",
    translations: { "en-GB": "In simple cases, determines whether a sequence is increasing or decreasing.", "pl-PL": "W prostych przypadkach bada, czy ciąg jest rosnący, czy malejący." },
  },
  {
    id: "sequences-checks-whether-given-sequence-arithmetic-geometric",
    categoryId: "sequences",
    translations: { "en-GB": "Checks whether a given sequence is arithmetic or geometric.", "pl-PL": "Sprawdza, czy dany ciąg jest arytmetyczny lub geometryczny." },
  },
  {
    id: "sequences-uses-formula-n-th-term-sum-first",
    categoryId: "sequences",
    translations: { "en-GB": "Uses the formula for the n-th term and the sum of the first n terms of an arithmetic sequence.", "pl-PL": "Stosuje wzór na n-ty wyraz i na sumę n początkowych wyrazów ciągu arytmetycznego." },
  },
  {
    id: "sequences-uses-formula-n-th-term-sum-first-2",
    categoryId: "sequences",
    translations: { "en-GB": "Uses the formula for the n-th term and the sum of the first n terms of a geometric sequence.", "pl-PL": "Stosuje wzór na n-ty wyraz i na sumę n początkowych wyrazów ciągu geometrycznego." },
  },
  {
    id: "sequences-uses-properties-sequences-including-arithmetic-geometric",
    categoryId: "sequences",
    translations: { "en-GB": "Uses properties of sequences, including arithmetic and geometric ones, to solve problems, also in practical contexts.", "pl-PL": "Wykorzystuje własności ciągów, w tym arytmetycznych i geometrycznych, do rozwiązywania zadań, również osadzonych w kontekście praktycznym." },
  },
  {
    id: "trigonometry-uses-definitions-sine-cosine-tangent-angles",
    categoryId: "trigonometry",
    translations: { "en-GB": "Uses the definitions of sine, cosine, and tangent for angles from 0° to 180°, and in particular determines the values of trigonometric functions for angles 30°, 45°, 60°;", "pl-PL": "Wykorzystuje definicje funkcji: sinus, cosinus i tangens dla kątów od 0° do 180°, w szczególności wyznacza wartości funkcji trygonometrycznych dla kątów 30°, 45°, 60°;" },
  },
  {
    id: "trigonometry-uses-formulas-sin-cos-1-tg",
    categoryId: "trigonometry",
    translations: { "en-GB": "Uses the formulas sin² α + cos² α = 1, and tg α = sin α / cos α.", "pl-PL": "Korzysta z wzorów sin² α + cos² α = 1, tg α = sin α / cos α." },
  },
  {
    id: "trigonometry-applies-cosine-rule-formula-area-triangle",
    categoryId: "trigonometry",
    translations: { "en-GB": "Applies the cosine rule and the formula for the area of a triangle P = 1/2 ab sin α;", "pl-PL": "Stosuje twierdzenie cosinusów oraz wzór na pole trójkąta P = 1/2 ab sin α;" },
  },
  {
    id: "trigonometry-calculates-angles-side-lengths-triangle-given",
    categoryId: "trigonometry",
    translations: { "en-GB": "Calculates the angles and side lengths of a triangle given appropriate data (solves triangles, e.g., using the cosine rule).", "pl-PL": "Oblicza kąty trójkąta i długości jego boków przy odpowiednich danych (rozwiązuje trójkąty m.in. z wykorzystaniem twierdzenia cosinusów)." },
  },
  {
    id: "trigonometry-calculates-angles-side-lengths-right-triangle",
    categoryId: "trigonometry",
    translations: { "en-GB": "Calculates the angles and side lengths of a right triangle given appropriate data (solves right triangles, including using trigonometric functions).", "pl-PL": "Oblicza kąty trójkąta prostokątnego i długości jego boków przy odpowiednich danych (rozwiązuje trójkąty prostokątne, w tym z wykorzystaniem funkcji trygonometrycznych)." },
  },
  {
    id: "plane-geometry-determines-radii-diameters-circles-lengths-chords",
    categoryId: "plane-geometry",
    translations: { "en-GB": "Determines radii and diameters of circles, lengths of chords and tangents, including using the Pythagorean theorem.", "pl-PL": "Wyznacza promienie i średnice okręgów, długości cięciw okręgów oraz odcinków stycznych, w tym z wykorzystaniem twierdzenia Pitagorasa." },
  },
  {
    id: "plane-geometry-recognizes-acute-right-obtuse-triangles-based",
    categoryId: "plane-geometry",
    translations: { "en-GB": "Recognizes acute, right, and obtuse triangles based on side lengths (e.g. applies the converse of the Pythagorean theorem and the cosine rule); applies the theorem: in a triangle, a longer side lies opposite a greater angle.", "pl-PL": "Rozpoznaje trójkąty ostrokątne, prostokątne i rozwartokątne przy danych długościach boków (m.in. stosuje twierdzenie odwrotne do twierdzenia Pitagorasa i twierdzenie cosinusów); stosuje twierdzenie: w trójkącie naprzeciw większego kąta wewnętrznego leży dłuższy bok." },
  },
  {
    id: "plane-geometry-recognizes-regular-polygons-uses-their-basic",
    categoryId: "plane-geometry",
    translations: { "en-GB": "Recognizes regular polygons and uses their basic properties.", "pl-PL": "Rozpoznaje wielokąty foremne i korzysta z ich podstawowych własności." },
  },
  {
    id: "plane-geometry-uses-properties-angles-diagonals-rectangles-parallelograms",
    categoryId: "plane-geometry",
    translations: { "en-GB": "Uses properties of angles and diagonals in rectangles, parallelograms, rhombuses, and trapezoids.", "pl-PL": "Korzysta z własności kątów i przekątnych w prostokątach, równoległobokach, rombach i trapezach." },
  },
  {
    id: "plane-geometry-applies-properties-inscribed-central-angles",
    categoryId: "plane-geometry",
    translations: { "en-GB": "Applies the properties of inscribed and central angles.", "pl-PL": "Stosuje własności kątów wpisanych i środkowych." },
  },
  {
    id: "plane-geometry-uses-formulas-area-circular-sector-length",
    categoryId: "plane-geometry",
    translations: { "en-GB": "Uses formulas for the area of a circular sector and the length of an arc.", "pl-PL": "Stosuje wzory na pole wycinka koła i długość łuku okręgu." },
  },
  {
    id: "plane-geometry-applies-theorems-thales-theorem-angle-bisector",
    categoryId: "plane-geometry",
    translations: { "en-GB": "Applies theorems such as Thales’ theorem, the angle bisector theorem, and the theorem about the angle between a tangent and a chord.", "pl-PL": "Stosuje twierdzenie Talesa, o dwusiecznej kąta oraz o kącie między styczną a cięciwą." },
  },
  {
    id: "plane-geometry-uses-properties-triangle-similarity",
    categoryId: "plane-geometry",
    translations: { "en-GB": "Uses properties of triangle similarity.", "pl-PL": "Korzysta z cech podobieństwa trójkątów." },
  },
  {
    id: "plane-geometry-uses-relationships-between-perimeters-areas-similar",
    categoryId: "plane-geometry",
    translations: { "en-GB": "Uses relationships between perimeters and areas of similar figures.", "pl-PL": "Wykorzystuje zależności między obwodami oraz między polami figur podobnych." },
  },
  {
    id: "plane-geometry-identifies-special-points-triangle-incenter-circumcenter",
    categoryId: "plane-geometry",
    translations: { "en-GB": "Identifies special points in a triangle: incenter, circumcenter, orthocenter, centroid, and uses their properties.", "pl-PL": "Wskazuje podstawowe punkty szczególne w trójkącie: środek okręgu wpisanego w trójkąt, środek okręgu opisanego na trójkącie, ortocentrum, środek ciężkości oraz korzysta z ich własności." },
  },
  {
    id: "plane-geometry-carries-out-geometric-proofs",
    categoryId: "plane-geometry",
    translations: { "en-GB": "Carries out geometric proofs.", "pl-PL": "Przeprowadza dowody geometryczne." },
  },
  {
    id: "plane-geometry-uses-trigonometric-functions-calculate-segment-lengths",
    categoryId: "plane-geometry",
    translations: { "en-GB": "Uses trigonometric functions to calculate segment lengths and areas of flat figures.", "pl-PL": "Stosuje funkcje trygonometryczne do wyznaczania długości odcinków w figurach płaskich oraz obliczania pól figur." },
  },
  {
    id: "analytic-geometry-identifies-relative-positions-lines-plane-based",
    categoryId: "analytic-geometry",
    translations: { "en-GB": "Identifies the relative positions of lines in the plane based on their equations, including finding the intersection point of two lines, if it exists;", "pl-PL": "Rozpoznaje wzajemne położenie prostych na płaszczyźnie na podstawie ich równań, w tym znajduje wspólny punkt dwóch prostych, jeśli taki istnieje;" },
  },
  {
    id: "analytic-geometry-uses-equations-lines-plane-slope-intercept-general",
    categoryId: "analytic-geometry",
    translations: { "en-GB": "Uses equations of lines in the plane, in slope-intercept and general form, including determining the equation of a line with given properties (e.g. passing through two given points, known slope, parallelism or perpendicularity to another line), or tangency to a circle;", "pl-PL": "Posługuje się równaniami prostych na płaszczyźnie, w postaci kierunkowej i ogólnej, w tym wyznacza równanie prostej o zadanych własnościach (takich, jak np. przechodzenie przez dwa dane punkty, znany współczynnik kierunkowy, równoległość lub prostopadłość do innej prostej), styczność do okręgu;" },
  },
  {
    id: "analytic-geometry-calculates-distance-between-two-points-coordinate",
    categoryId: "analytic-geometry",
    translations: { "en-GB": "Calculates the distance between two points in the coordinate system;", "pl-PL": "Oblicza odległość dwóch punktów w układzie współrzędnych;" },
  },
  {
    id: "analytic-geometry-uses-equation-circle-x-2-y",
    categoryId: "analytic-geometry",
    translations: { "en-GB": "Uses the equation of a circle (x − a)^2 + (y − b)^2 = r^2;", "pl-PL": "Posługuje się równaniem okręgu (x − a)^2 + (y − b)^2 = r^2;" },
  },
  {
    id: "analytic-geometry-calculates-distance-point-line",
    categoryId: "analytic-geometry",
    translations: { "en-GB": "Calculates the distance from a point to a line;", "pl-PL": "Oblicza odległość punktu od prostej;" },
  },
  {
    id: "analytic-geometry-determines-images-circles-polygons-under-axial",
    categoryId: "analytic-geometry",
    translations: { "en-GB": "Determines images of circles and polygons under axial symmetries with respect to the coordinate axes, and central symmetry (centered at the origin).", "pl-PL": "Wyznacza obrazy okręgów i wielokątów w symetriach osiowych względem osi układu współrzędnych, symetrii środkowej (o środku w początku układu współrzędnych)." },
  },
  {
    id: "solid-geometry-identifies-relative-positions-lines-space-especially",
    categoryId: "solid-geometry",
    translations: { "en-GB": "Identifies relative positions of lines in space, especially skew and perpendicular lines.", "pl-PL": "Rozpoznaje wzajemne położenie prostych w przestrzeni, w szczególności proste prostopadłe nieprzecinające się." },
  },
  {
    id: "solid-geometry-uses-concept-angle-between-line-plane",
    categoryId: "solid-geometry",
    translations: { "en-GB": "Uses the concept of the angle between a line and a plane and the dihedral angle between half-planes.", "pl-PL": "Posługuje się pojęciem kąta między prostą a płaszczyzną oraz pojęciem kąta dwuściennego między półpłaszczyznami." },
  },
  {
    id: "solid-geometry-identifies-angles-between-segments-edges-edges",
    categoryId: "solid-geometry",
    translations: { "en-GB": "Identifies angles between segments (e.g. edges, edges and diagonals) and between faces in prisms and pyramids, and calculates their measures.", "pl-PL": "Rozpoznaje w graniastosłupach i ostrosłupach kąty między odcinkami (np. krawędziami, krawędziami i przekątnymi) oraz kąty między ścianami, oblicza miary tych kątów." },
  },
  {
    id: "solid-geometry-identifies-angles-between-segments-between-segments",
    categoryId: "solid-geometry",
    translations: { "en-GB": "Identifies angles between segments and between segments and planes (e.g. cone aperture angle, angle between generatrix and base) in cylinders and cones, and calculates their measures.", "pl-PL": "Rozpoznaje w walcach i w stożkach kąt między odcinkami oraz kąt między odcinkami i płaszczyznami (np. kąt rozwarcia stożka, kąt między tworzącą a podstawą), oblicza miary tych kątów." },
  },
  {
    id: "solid-geometry-calculates-volumes-surface-areas-prisms-pyramids",
    categoryId: "solid-geometry",
    translations: { "en-GB": "Calculates volumes and surface areas of prisms, pyramids, cylinders, cones, and spheres, also using trigonometry.", "pl-PL": "Oblicza objętości i pola powierzchni graniastosłupów, ostrosłupów, walca, stożka i kuli, również z wykorzystaniem trygonometrii." },
  },
  {
    id: "solid-geometry-applies-relationship-between-volumes-similar-solids",
    categoryId: "solid-geometry",
    translations: { "en-GB": "Applies the relationship between the volumes of similar solids.", "pl-PL": "Wykorzystuje zależność między objętościami brył podobnych." },
  },
  {
    id: "solid-geometry-applies-relationship-between-volumes-similar-prisms",
    categoryId: "solid-geometry",
    translations: { "en-GB": "Applies the relationship between the volumes of similar prisms and pyramids.", "pl-PL": "Wykorzystuje zależność między objętościami graniastosłupów oraz ostrosłupów podobnych." },
  },
  {
    id: "combinatorics-counts-objects-simple-combinatorial-situations",
    categoryId: "combinatorics",
    translations: { "en-GB": "counts objects in simple combinatorial situations;", "pl-PL": "zlicza obiekty w prostych sytuacjach kombinatorycznych;" },
  },
  {
    id: "combinatorics-counts-objects-using-multiplication-addition-rules",
    categoryId: "combinatorics",
    translations: { "en-GB": "counts objects using multiplication and addition rules (also combined) for any number of actions", "pl-PL": "zlicza obiekty, stosując reguły mnożenia i dodawania (także łącznie) dla dowolnej liczby czynnośc" },
  },
  {
    id: "probability-and-statistics-calculates-probability-classical-model",
    categoryId: "probability-and-statistics",
    translations: { "en-GB": "Calculates probability in the classical model;", "pl-PL": "Oblicza prawdopodobieństwo w modelu klasycznym;" },
  },
  {
    id: "probability-and-statistics-calculates-arithmetic-mean-weighted-mean-finds",
    categoryId: "probability-and-statistics",
    translations: { "en-GB": "Calculates the arithmetic mean and weighted mean, finds the median and mode.", "pl-PL": "Oblicza średnią arytmetyczną i średnią ważoną, znajduje medianę i dominantę." },
  },
  {
    id: "probability-and-statistics-calculates-standard-deviation-data-set-appropriately",
    categoryId: "probability-and-statistics",
    translations: { "en-GB": "Calculates the standard deviation of a data set (also for appropriately grouped data), interprets this parameter for empirical data.", "pl-PL": "Oblicza odchylenie standardowe zestawu danych (także w przypadku danych odpowiednio pogrupowanych), interpretuje ten parametr dla danych empirycznych." },
  },
  {
    id: "optimization-and-differential-calculus-solves-optimization-problems-situations-can-described",
    categoryId: "optimization-and-differential-calculus",
    translations: { "en-GB": "solves optimization problems in situations that can be described by a quadratic function.", "pl-PL": "rozwiązuje zadania optymalizacyjne w sytuacjach dających się opisać funkcją kwadratową." },
  },
];

export async function handler(): Promise<{ written: number }> {
  await batchPutAll(Resource.Requirements.name, SEED);
  console.log(`SeedRequirements: written=${SEED.length}`);
  return { written: SEED.length };
}
