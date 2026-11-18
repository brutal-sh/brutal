/* Emit unhinted 26.6 glyph outlines from a TrueType font's 64-pixel strike. */
#include <assert.h>
#include <stdint.h>
#include <stdio.h>

#include <ft2build.h>
#include FT_FREETYPE_H
#include FT_MULTIPLE_MASTERS_H
#include FT_OUTLINE_H

struct glyph {
    int16_t words[UINT16_MAX];
    size_t length;
    int contour_open;
};

static void word(struct glyph *glyph, long value) {
    assert(glyph->length < UINT16_MAX && value >= INT16_MIN && value <= INT16_MAX);
    glyph->words[glyph->length++] = (int16_t)value;
}

static void point(struct glyph *glyph, const FT_Vector *position) {
    word(glyph, position->x);
    word(glyph, -position->y);
}

static int move(const FT_Vector *position, void *data) {
    struct glyph *glyph = data;
    if (glyph->contour_open) word(glyph, 5);
    word(glyph, 0);
    point(glyph, position);
    glyph->contour_open = 1;
    return 0;
}

static int line(const FT_Vector *position, void *data) {
    struct glyph *glyph = data;
    word(glyph, 1);
    point(glyph, position);
    return 0;
}

static int quad(const FT_Vector *control, const FT_Vector *end, void *data) {
    struct glyph *glyph = data;
    word(glyph, 2);
    point(glyph, control);
    point(glyph, end);
    return 0;
}

static int unsupported_cubic(const FT_Vector *a, const FT_Vector *b, const FT_Vector *end, void *data) {
    (void)a; (void)b; (void)end; (void)data;
    return 1;
}

static void write_word(uint16_t value) {
    putchar(value & 255);
    putchar(value >> 8);
}

int main(int argc, char **argv) {
    assert(argc == 2);
    FT_Library library;
    FT_Face font;
    FT_MM_Var *axes;
    assert(FT_Init_FreeType(&library) == 0);
    assert(FT_New_Face(library, argv[1], 0, &font) == 0);
    assert(FT_Get_MM_Var(font, &axes) == 0);
    FT_Fixed coordinates[axes->num_axis];
    int found_weight = 0;
    for (FT_UInt i = 0; i < axes->num_axis; i++) {
        const int is_weight = axes->axis[i].tag == FT_MAKE_TAG('w', 'g', 'h', 't');
        coordinates[i] = is_weight ? 500L * 65536L : axes->axis[i].def;
        found_weight |= is_weight;
    }
    assert(found_weight);
    assert(FT_Set_Var_Design_Coordinates(font, axes->num_axis, coordinates) == 0);
    assert(FT_Set_Pixel_Sizes(font, 64, 64) == 0);
    assert(font->num_glyphs > 0 && font->num_glyphs <= UINT16_MAX);

    const FT_Outline_Funcs callbacks = {move, line, quad, unsupported_cubic, 0, 0};
    struct glyph glyph;
    write_word((uint16_t)font->num_glyphs);
    for (FT_UInt id = 0; id < (FT_UInt)font->num_glyphs; id++) {
        assert(FT_Load_Glyph(font, id, FT_LOAD_NO_HINTING | FT_LOAD_NO_BITMAP) == 0);
        assert(font->glyph->format == FT_GLYPH_FORMAT_OUTLINE);
        glyph.length = 0;
        glyph.contour_open = 0;
        assert(FT_Outline_Decompose(&font->glyph->outline, &callbacks, &glyph) == 0);
        if (glyph.contour_open) word(&glyph, 5);
        write_word((uint16_t)glyph.length);
        for (size_t i = 0; i < glyph.length; i++) write_word((uint16_t)glyph.words[i]);
    }
    FT_Done_MM_Var(library, axes);
    FT_Done_Face(font);
    FT_Done_FreeType(library);
    return ferror(stdout) ? 1 : 0;
}
