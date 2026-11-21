'use client';

import { useState, useCallback } from 'react';

import Cropper from 'react-easy-crop';
import { CropIcon } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';

interface Point {
    x: number;
    y: number;
}

interface Area {
    width: number;
    height: number;
    x: number;
    y: number;
}

interface ImageCropperProps {
    open?: boolean;
    imageSrc: string;
    aspectRatio: number;
    onCropComplete: (croppedFile: File, croppedUrl: string) => void;
    onCancel: () => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();

        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

async function getCroppedImg(
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0
): Promise<{ file: File; url: string } | null> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return null;
    }

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);
    ctx.drawImage(
        image,
        safeArea / 2 - image.width * 0.5,
        safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
        data,
        Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
        Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                resolve(null);

                return;
            }

            const file = new File([blob], 'cropped_image.jpg', { type: 'image/jpeg' });

            resolve({ file, url: URL.createObjectURL(blob) });
        }, 'image/jpeg');
    });
}

export default function ImageCropper({
    open = true,
    imageSrc,
    aspectRatio,
    onCropComplete,
    onCancel,
}: ImageCropperProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropCompleteHandler = useCallback(
        (croppedArea: Area, croppedAreaPx: Area) => {
            setCroppedAreaPixels(croppedAreaPx);
        },
        []
    );

    const handleConfirm = async () => {
        if (croppedAreaPixels) {
            const result = await getCroppedImg(imageSrc, croppedAreaPixels);

            if (result) {
                onCropComplete(result.file, result.url);
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={v => !v && onCancel()}>
            <DialogContent
                className='flex flex-col gap-4 sm:max-w-2xl'
                showCloseButton={false}
            >
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <CropIcon className='h-5 w-5' />
                        Recortar imagem
                    </DialogTitle>
                </DialogHeader>

                <div className='relative h-[min(400px,55dvh)] w-full overflow-hidden rounded-lg bg-black'>
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio}
                        onCropChange={setCrop}
                        onCropComplete={onCropCompleteHandler}
                        onZoomChange={setZoom}
                    />
                </div>

                <p className='text-muted-foreground text-center text-xs'>
                    Arraste para posicionar e use a rolagem do mouse (ou o gesto de pinça) para ajustar o zoom.
                </p>

                <DialogFooter>
                    <Button variant='outline' type='button' onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button type='button' onClick={handleConfirm}>
                        Aplicar recorte
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export { ImageCropper, ImageCropper as ImageCropperModal };
